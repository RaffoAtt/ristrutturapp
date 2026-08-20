-- =====================================================
-- SCHEMA SUPABASE — Sistema 1:N (Admin → Clienti)
-- Esegui questo script nel SQL Editor di Supabase
-- IDEMPOTENTE: può essere eseguito più volte senza errori
-- =====================================================

-- ─────────────────────────────────────────────
-- 1. TABELLA PROFILES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role            TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'client')),
  admin_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_project_id UUID,
  display_name    TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Utenti vedono il proprio profilo" ON profiles;
DROP POLICY IF EXISTS "Admin vede i profili dei propri clienti" ON profiles;
DROP POLICY IF EXISTS "Inserimento profilo proprio" ON profiles;
DROP POLICY IF EXISTS "Aggiornamento profilo proprio o da admin" ON profiles;
DROP POLICY IF EXISTS "Utenti vedono solo il proprio profilo" ON profiles;
DROP POLICY IF EXISTS "Utenti aggiornano solo il proprio profilo" ON profiles;

CREATE POLICY "Utenti vedono il proprio profilo" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin vede i profili dei propri clienti" ON profiles
  FOR SELECT USING (auth.uid() = admin_id);

CREATE POLICY "Inserimento profilo proprio" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Aggiornamento profilo proprio o da admin" ON profiles
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = admin_id);

-- ─────────────────────────────────────────────
-- 2. TABELLA PROGETTI
-- (deve essere prima di invitations per la FK)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS progetti (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  indirizzo   TEXT,
  budget      NUMERIC(12,2) DEFAULT 0,
  data_inizio DATE,
  data_fine   DATE,
  note        TEXT,
  show_prices_to_client BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE progetti ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin accesso completo ai propri progetti" ON progetti;
DROP POLICY IF EXISTS "Client legge il proprio progetto" ON progetti;
DROP POLICY IF EXISTS "Client legge il progetto collegato" ON progetti;

CREATE POLICY "Admin accesso completo ai propri progetti" ON progetti
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Client legge il progetto collegato" ON progetti
  FOR SELECT USING (
    id IN (
      SELECT linked_project_id FROM profiles
      WHERE user_id = auth.uid() AND role = 'client'
    )
  );

-- ─────────────────────────────────────────────
-- 3. TABELLA INVITATIONS (sistema inviti)
-- (dopo progetti, per la FK su project_id)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invitations (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token        TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  admin_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id   UUID REFERENCES progetti(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT DEFAULT '',
  expires_at   TIMESTAMPTZ DEFAULT now() + interval '7 days',
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestisce i propri inviti" ON invitations;
DROP POLICY IF EXISTS "Lettura pubblica inviti per validazione" ON invitations;

CREATE POLICY "Admin gestisce i propri inviti" ON invitations
  FOR ALL USING (auth.uid() = admin_id);

CREATE POLICY "Lettura pubblica inviti per validazione" ON invitations
  FOR SELECT USING (true);

-- Permetti agli utenti anonimi di leggere inviti (necessario per validazione link)
GRANT SELECT ON invitations TO anon;
GRANT SELECT ON invitations TO authenticated;
GRANT SELECT ON progetti TO anon;
GRANT SELECT ON progetti TO authenticated;

-- ─────────────────────────────────────────────
-- 4. TABELLA LAVORI
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lavori (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  progetto_id  UUID REFERENCES progetti(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  categoria    TEXT DEFAULT 'Altro',
  stato        TEXT DEFAULT 'da_fare',
  preventivo   NUMERIC(12,2) DEFAULT 0,
  avanzamento  INTEGER DEFAULT 0,
  priorita     TEXT DEFAULT 'normale',
  note         TEXT,
  data_inizio  DATE,
  data_fine    DATE,
  fornitore_id UUID,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE lavori ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin accesso completo ai lavori" ON lavori;
DROP POLICY IF EXISTS "Client legge i lavori del proprio progetto" ON lavori;
DROP POLICY IF EXISTS "Client aggiorna stato lavori del proprio progetto" ON lavori;
DROP POLICY IF EXISTS "Client aggiorna stato lavori per approvazione" ON lavori;

CREATE POLICY "Admin accesso completo ai lavori" ON lavori
  FOR ALL USING (
    progetto_id IN (SELECT id FROM progetti WHERE user_id = auth.uid())
  );

CREATE POLICY "Client legge i lavori del proprio progetto" ON lavori
  FOR SELECT USING (
    progetto_id IN (
      SELECT linked_project_id FROM profiles
      WHERE user_id = auth.uid() AND role = 'client'
    )
  );

CREATE POLICY "Client aggiorna stato lavori per approvazione" ON lavori
  FOR UPDATE USING (
    progetto_id IN (
      SELECT linked_project_id FROM profiles
      WHERE user_id = auth.uid() AND role = 'client'
    )
  );

-- ─────────────────────────────────────────────
-- 5. TABELLA SPESE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spese (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  progetto_id  UUID REFERENCES progetti(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  descrizione  TEXT NOT NULL,
  importo      NUMERIC(12,2) NOT NULL,
  categoria    TEXT DEFAULT 'Altro',
  data         DATE,
  lavoro_id    UUID,
  fornitore_id UUID,
  pagamento    TEXT DEFAULT 'Bonifico',
  ricevuta     BOOLEAN DEFAULT false,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE spese ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin accesso completo alle spese" ON spese;
DROP POLICY IF EXISTS "Client legge le spese del proprio progetto" ON spese;

CREATE POLICY "Admin accesso completo alle spese" ON spese
  FOR ALL USING (
    progetto_id IN (SELECT id FROM progetti WHERE user_id = auth.uid())
  );

CREATE POLICY "Client legge le spese del proprio progetto" ON spese
  FOR SELECT USING (
    progetto_id IN (
      SELECT linked_project_id FROM profiles
      WHERE user_id = auth.uid() AND role = 'client'
    )
  );

-- ─────────────────────────────────────────────
-- 6. TABELLA FORNITORI
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fornitori (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  tipo       TEXT DEFAULT 'Altro',
  tel        TEXT,
  email      TEXT,
  piva       TEXT,
  rating     INTEGER DEFAULT 0,
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fornitori ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Utenti vedono i propri fornitori" ON fornitori;
DROP POLICY IF EXISTS "Admin gestisce i propri fornitori" ON fornitori;

CREATE POLICY "Admin gestisce i propri fornitori" ON fornitori
  FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 7. TABELLA SCADENZE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scadenze (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  progetto_id UUID REFERENCES progetti(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  titolo      TEXT NOT NULL,
  data        DATE,
  tipo        TEXT DEFAULT 'altro',
  lavoro_id   UUID,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scadenze ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin accesso completo alle scadenze" ON scadenze;
DROP POLICY IF EXISTS "Client legge le scadenze del proprio progetto" ON scadenze;

CREATE POLICY "Admin accesso completo alle scadenze" ON scadenze
  FOR ALL USING (
    progetto_id IN (SELECT id FROM progetti WHERE user_id = auth.uid())
  );

CREATE POLICY "Client legge le scadenze del proprio progetto" ON scadenze
  FOR SELECT USING (
    progetto_id IN (
      SELECT linked_project_id FROM profiles
      WHERE user_id = auth.uid() AND role = 'client'
    )
  );

-- ─────────────────────────────────────────────
-- 8. TABELLA NOTE_CLIENTE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS note_cliente (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lavoro_id  UUID REFERENCES lavori(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  testo      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE note_cliente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Utenti gestiscono le proprie note" ON note_cliente;
DROP POLICY IF EXISTS "Admin vede note sui propri lavori" ON note_cliente;

CREATE POLICY "Utenti gestiscono le proprie note" ON note_cliente
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admin vede note sui propri lavori" ON note_cliente
  FOR SELECT USING (
    lavoro_id IN (
      SELECT id FROM lavori WHERE progetto_id IN (
        SELECT id FROM progetti WHERE user_id = auth.uid()
      )
    )
  );

-- ─────────────────────────────────────────────
-- 9. TABELLA DOCUMENTI
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documenti (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  progetto_id      UUID REFERENCES progetti(id) ON DELETE CASCADE,
  nome             TEXT NOT NULL,
  tipo             TEXT DEFAULT 'altro',
  storage_path     TEXT NOT NULL,
  visibile_cliente BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE documenti ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestisce documenti dei propri progetti" ON documenti;
DROP POLICY IF EXISTS "Client vede documenti visibili del proprio progetto" ON documenti;

CREATE POLICY "Admin gestisce documenti dei propri progetti" ON documenti
  FOR ALL USING (
    progetto_id IN (SELECT id FROM progetti WHERE user_id = auth.uid())
  );

CREATE POLICY "Client vede documenti visibili del proprio progetto" ON documenti
  FOR SELECT USING (
    visibile_cliente = true AND
    progetto_id IN (
      SELECT linked_project_id FROM profiles
      WHERE user_id = auth.uid() AND role = 'client'
    )
  );

-- ─────────────────────────────────────────────
-- 10. TRIGGER: crea profilo admin per ogni nuovo utente
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role, display_name)
  VALUES (NEW.id, 'admin', COALESCE(NEW.raw_user_meta_data->>'display_name', ''))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─────────────────────────────────────────────
-- 11. FUNZIONE: processa invito dopo registrazione
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_invitation(p_token TEXT, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  invite RECORD;
BEGIN
  SELECT * INTO invite
  FROM public.invitations
  WHERE token = p_token
    AND used_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invito non valido o scaduto');
  END IF;

  UPDATE public.profiles SET
    role = 'client',
    admin_id = invite.admin_id,
    linked_project_id = invite.project_id,
    display_name = CASE WHEN invite.display_name != '' THEN invite.display_name ELSE display_name END
  WHERE user_id = p_user_id;

  UPDATE public.invitations SET used_at = now() WHERE id = invite.id;

  RETURN jsonb_build_object('success', true, 'project_id', invite.project_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- 12. PROMUOVI ACCOUNT ESISTENTE AD ADMIN
-- Esegui questa query separata per un account già registrato:
--
-- INSERT INTO profiles (user_id, role, display_name)
-- SELECT id, 'admin', email FROM auth.users WHERE email = 'tua@email.com'
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
--
-- COME FUNZIONA IL SISTEMA:
--
-- 1. L'azienda si registra → profilo 'admin' creato automaticamente
-- 2. Admin crea progetto → va su Impostazioni → Gestione Clienti
-- 3. Genera link invito → lo invia al cliente
-- 4. Il cliente clicca il link → si registra (signup visibile solo con token)
-- 5. process_invitation() converte profilo da 'admin' a 'client'
-- 6. Il cliente accede e vede solo il suo progetto in sola lettura
-- ─────────────────────────────────────────────
