import json
import subprocess
import os

# Vider le fichier
log_file = r"C:\Users\diall\Documents\LABICOTAXI\NewMaquettes\logSupabase\log.json"
with open(log_file, 'w') as f:
    json.dump([], f)

print("📋 INSTRUCTIONS POUR RÉCUPÉRER LES LOGS:")
print("=" * 50)
print("1. Allez sur le Dashboard Supabase:")
print("   https://supabase.com/dashboard/project/nmwnibzgvwltipmtwhzo/functions/whatsapp-bot/logs")
print("")
print("2. Dans le filtre en haut:")
print("   - Sélectionnez 'Last 5 minutes'")
print("   - Ou utilisez le filtre personnalisé")
print("")
print("3. Copiez tous les logs affichés")
print("")
print(f"4. Collez les logs dans: {log_file}")
print("")
print("5. Sauvegardez le fichier")
print("=" * 50)

# Ouvrir le fichier pour faciliter
os.startfile(log_file)