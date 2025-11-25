#!/bin/bash

# Script per caricare le tue 10 foto personali su Cloudinary
# Uso: ./upload-my-photos.sh /percorso/alla/cartella/con/le/foto

if [ -z "$1" ]; then
  echo "❌ Errore: specifica la cartella con le foto"
  echo "Uso: $0 /percorso/cartella/foto"
  echo ""
  echo "Esempio: $0 ~/Downloads/compositori"
  exit 1
fi

PHOTO_DIR="$1"

if [ ! -d "$PHOTO_DIR" ]; then
  echo "❌ Errore: la cartella $PHOTO_DIR non esiste"
  exit 1
fi

echo "📁 Cartella foto: $PHOTO_DIR"
echo ""

# Lista dei file attesi
declare -a files=(
  "vasily-kalinnikov.jpg"
  "francesco-sartori.jpg"
  "stanislao-gastaldon.jpg"
  "ernesto-de-curtis.jpg"
  "dong-jin-kim.jpg"
  "marco-enrico-bossi.jpg"
  "peter-warlock.jpg"
  "salvatore-cardillo.jpg"
  "yeon-jun-kim.jpg"
  "young-seop-choi.jpg"
)

# Controlla se i file esistono
echo "🔍 Controllo file..."
missing=0
for file in "${files[@]}"; do
  if [ -f "$PHOTO_DIR/$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (MANCANTE)"
    missing=$((missing + 1))
  fi
done

if [ $missing -gt 0 ]; then
  echo ""
  echo "❌ Mancano $missing file. Controlla i nomi e riprova."
  exit 1
fi

echo ""
echo "✅ Tutti i 10 file trovati!"
echo ""
echo "☁️  Caricamento su Cloudinary..."
echo ""

# Carica ogni file
for file in "${files[@]}"; do
  slug="${file%.jpg}"
  echo "📤 Caricamento $file..."

  CLOUDINARY_CLOUD_NAME=dnwhnz2xy \
  CLOUDINARY_API_KEY=475369637192245 \
  CLOUDINARY_API_SECRET=M5oAuFh6ArdI8KT-A13bcKyvao0 \
  node -e "
    import { v2 as cloudinary } from 'cloudinary';

    cloudinary.config({
      cloud_name: 'dnwhnz2xy',
      api_key: '475369637192245',
      api_secret: 'M5oAuFh6ArdI8KT-A13bcKyvao0'
    });

    const result = await cloudinary.uploader.upload('$PHOTO_DIR/$file', {
      folder: 'danielecamiz/composers',
      public_id: '$slug',
      resource_type: 'image',
      overwrite: true,
      invalidate: true
    });

    console.log('   ✅ Caricato:', result.secure_url);
  "
done

echo ""
echo "✅ Tutti i file caricati su Cloudinary!"
echo ""
echo "📝 Aggiornamento database..."

node scripts/update-personal-composers.js

echo ""
echo "🎉 FATTO! Verifica su: http://localhost:3001/concerts/repertoire"
