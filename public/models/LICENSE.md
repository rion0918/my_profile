# Rion walker — source and license

Base meshes, rig and animations: **Quaternius — Ultimate Modular Men Pack (February 2022)**.
Author's page: https://quaternius.com/packs/ultimatemodularcharacters.html
Author's license: **CC0 1.0 Universal**, https://creativecommons.org/publicdomain/zero/1.0/
Author's release: https://www.patreon.com/posts/ultimate-modular-62873637
Original public distribution: https://drive.google.com/drive/folders/1USAAquX2JJWuA2m6zol0KUkFe3UkZ8zX

Google Drive returned a download-quota error on 2026-10-23. The same named CC0 files were obtained from the public mirror:
https://github.com/agentkaerf/FreeModels/tree/main/Ultimate%20Modular%20Men-%20Feb%202022/Individual%20Characters/glTF

Inputs: `Casual_2.gltf` (trousers, sneakers, skeleton, Idle / Walk / Run clips) and `Casual_Hoodie.gltf` (jacket/body). The source author is Quaternius; the mirror is only a download source.

## Reproduction

With these two source files downloaded locally:

```
node scripts/build-character.mjs /path/to/Casual_2.gltf /path/to/Casual_Hoodie.gltf
```

The script binds the hoodie to the original skeleton and replaces the original head with a student portrait modeled in `scripts/student-portrait.mjs`. The new face, swept fringe and peaked cap attach to the head bone. The ochre daypack, straps and hoodie drawstrings follow the chest. The blue hoodie, slate trousers and teal sneakers use the original skinned clothing. The export retains Idle, Walk and Run for runtime animation blending.

The portrait, daypack, clothing details and processing code are part of this portfolio implementation. No endorsement by Quaternius is implied.

Source verification (SHA-256):
- `Casual_2.gltf`: `55c654d09a2a5ff6e3bd6158d4a1b462f181cd6f1e12a0f5e9d959f9c3abc438`
- `Casual_Hoodie.gltf`: `dd74886c26998a0fa888b4ce557a0932d7d97b0265dd4c763154d081b7a6cb98`
- Mirror tree inspected: `db3df04d1e4714298a09510b26fb6de6645138a2`
