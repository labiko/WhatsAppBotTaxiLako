#!/bin/bash
# Script pour nettoyer les secrets des fichiers

# Remplacer les clés OpenAI
find . -name "*.ts" -o -name "*.js" -o -name "*.md" -o -name "*.cmd" -o -name "*.sh" -o -name "*.cs" -o -name "*.ps1" | xargs sed -i 's/sk-proj-[A-Za-z0-9_-]\{1,\}/OPENAI_API_KEY_REMOVED/g'

# Remplacer les tokens HuggingFace
find . -name "*.ts" -o -name "*.js" -o -name "*.md" -o -name "*.cmd" -o -name "*.sh" -o -name "*.cs" -o -name "*.ps1" | xargs sed -i 's/hf_[A-Za-z0-9_-]\{1,\}/HUGGINGFACE_TOKEN_REMOVED/g'

# Remplacer les Twilio SID
find . -name "*.ts" -o -name "*.js" -o -name "*.md" -o -name "*.cmd" -o -name "*.sh" -o -name "*.cs" -o -name "*.ps1" | xargs sed -i 's/AC[a-f0-9]\{32\}/TWILIO_SID_REMOVED/g'

echo "Secrets nettoyés !"