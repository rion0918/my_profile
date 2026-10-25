# Rion walker — source and license

Base meshes, rig and animations: **Quaternius — Ultimate Modular Men Pack (February 2022)**.
Author's page: https://quaternius.com/packs/ultimatemodularcharacters.html
Author's license: **CC0 1.0 Universal**, https://creativecommons.org/publicdomain/zero/1.0/
Author's release: https://www.patreon.com/posts/ultimate-modular-62873637
Original public distribution: https://drive.google.com/drive/folders/1USAAquX2JJWuA2m6zol0KUkFe3UkZ8zX

Google Drive returned a download-quota error on 2026-10-23. The same named CC0 files were obtained from the public mirror:
https://github.com/agentkaerf/FreeModels/tree/main/Ultimate%20Modular%20Men-%20Feb%202022/Individual%20Characters/glTF

Inputs: `Casual_2.gltf` (head, trousers, sneakers, skeleton, Idle / Walk / Run clips) and `Casual_Hoodie.gltf` (jacket/body). The source author is Quaternius; the mirror is only a download source.

## Reproduction

With these two source files downloaded locally:

```
node scripts/build-character.mjs /path/to/Casual_2.gltf /path/to/Casual_Hoodie.gltf
```

The script binds the hoodie body to the original named skeleton, recolors the jacket in terracotta, trousers in slate, sneakers in sage/ecru, and hair in charcoal. It enlarges the head to 1.45× for a roughly five-head stylized silhouette, removes the low rear hair triangles for a short haircut, adds a zipper, patch pockets, shoulder straps, and a rounded backpack attached to the chest bone, retains only Idle, Walk, and Run, and exports `rion-walker.glb`. Runtime uses AnimationMixer blending and scales the walk and run clips to movement speed. No remote asset requests are needed by the shipped site.

The added backpack and processing code are part of this portfolio implementation. No endorsement by Quaternius is implied.

Source verification (SHA-256):
- `Casual_2.gltf`: `55c654d09a2a5ff6e3bd6158d4a1b462f181cd6f1e12a0f5e9d959f9c3abc438`
- `Casual_Hoodie.gltf`: `dd74886c26998a0fa888b4ce557a0932d7d97b0265dd4c763154d081b7a6cb98`
- Mirror tree inspected: `db3df04d1e4714298a09510b26fb6de6645138a2`
