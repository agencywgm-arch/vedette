# Vues morphologie (Mince / Large) — mode d'emploi

Le sélecteur est déjà dans la cabine : il apparaît dès qu'une pièce déclare `fit`
dans `src/data/collection.ts`. Médium = la rotation 16 angles existante.

## Fichiers attendus (par pièce et par morphologie)

`public/cabine/fit/<id>-<mince|large>/{0,1,2,3}.webp` — 4 images, 1000 px de large, ratio 4:5

| Fichier | Angle |
|---|---|
| 0.webp | face |
| 1.webp | 90° |
| 2.webp | dos (180°) |
| 3.webp | 270° |

Puis, dans la pièce : `fit: ["mince", "large"]`.

Pièces concernées (les casquettes et le sac ne changent pas selon le corps) :
jparis-tee, champions-tee, paris-polo, vedette-vneck, boxe-khoya-tank,
forreal-tee, rainbow-jersey, jparis-sweat, black-jacket. → 9 × 2 × 4 = 72 images.

## Prompt (même mannequin, autre corps)

Image 1 = la photo médium de la pièce au même angle (`public/cabine/looks/<id>/<0|4|8|12>.webp`).
Image 2 (facultative) = la photo produit.

```
Studio fashion photo. Image 1 shows a man in a black balaclava wearing a garment, in a dark blue-grey circular studio. Keep exactly the same garment (every print, patch, label and colour unchanged), the same black balaclava, baggy black jeans, black sneakers, studio background, lighting, camera framing and the same viewing angle. Change only the body: {MORPHOLOGIE}. The garment keeps the same cut and the same size, so it fits this body differently (drape, tightness, length). Forearms and hands are natural pale human skin, not white, not gloves. Full body, centered.
```

`{MORPHOLOGIE}` :
- mince : "a slim, lean build, narrow shoulders, about 1m75 and 62 kg"
- large : "a broad, heavy build, wide shoulders and chest, about 1m85 and 100 kg"

## Gratuit

Voir la réponse de la session : app Gemini gratuite (à la main), Hugging Face
ZeroGPU (quelques images par jour), ou Qwen-Image-Edit en local.
