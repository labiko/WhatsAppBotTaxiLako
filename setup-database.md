# Guide de configuration de la base de données

## Option 1 : Via Supabase Dashboard (Recommandé)

1. Connectez-vous à votre projet Supabase : https://app.supabase.com/project/nmwnibzgvwltipmtwhzo

2. Allez dans **SQL Editor** (icône de terminal dans la barre latérale)

3. Cliquez sur **New Query**

4. Copiez et collez le contenu du fichier `sql/create_reservations.sql`

5. Cliquez sur **Run** (ou Ctrl+Enter)

## Option 2 : Via Supabase CLI

1. Installez Supabase CLI si ce n'est pas déjà fait :
   
   **Pour Windows (via Scoop) :**
   ```bash
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```
   
   **Ou téléchargez directement :**
   - Allez sur https://github.com/supabase/cli/releases
   - Téléchargez `supabase_windows_amd64.tar.gz`
   - Extrayez et ajoutez au PATH

2. Connectez-vous à Supabase :
   ```bash
   supabase login
   ```

3. Liez votre projet :
   ```bash
   supabase link --project-ref nmwnibzgvwltipmtwhzo
   ```

4. Exécutez le script SQL :
   ```bash
   supabase db push < sql/create_reservations.sql
   ```

## Vérification

Pour vérifier que la table a été créée correctement :

1. Dans Supabase Dashboard → Table Editor
2. Vous devriez voir la table `reservations`
3. Vérifiez que les colonnes sont correctes :
   - id (uuid)
   - client_phone (text)
   - vehicle_type (text)
   - pickup_location (geography)
   - status (text)
   - created_at (timestamp)

## Note importante

Si vous obtenez une erreur concernant PostGIS, c'est normal. Supabase active automatiquement PostGIS pour les projets qui en ont besoin. Vous pouvez ignorer cette erreur ou commenter la ligne `CREATE EXTENSION IF NOT EXISTS "postgis";` dans le script SQL.