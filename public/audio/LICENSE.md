# Bossa Antigua — music credit and source

"Bossa Antigua" — Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License.

- Artist: https://incompetech.com/
- Track / current license notice: https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700069
- Official download: https://incompetech.com/music/royalty-free/mp3-royaltyfree/Bossa%20Antigua.mp3
- License: https://creativecommons.org/licenses/by/4.0/
- Legal code: https://creativecommons.org/licenses/by/4.0/legalcode.en
- ISRC: USUAN1700069
- Retrieved: 2026-10-24 (Asia/Tokyo)

The current official track page specifies CC BY 4.0. Its public `pieces.json`
record identifies the title, artist catalog entry, filename and ISRC. The
website's track template displays the title, Kevin MacLeod, incompetech.com,
and the CC BY 4.0 notice. Older mirrors may show an earlier license version;
this asset was downloaded directly from the current official source above.

Changes: loudness normalized to -22 LUFS with a -2 dBTP ceiling, re-encoded
as stereo 44.1 kHz / 128 kbps MP3, with title, artist and license metadata.
The composition, tempo and duration are unchanged. The player repeats the
track and lets the visitor adjust its playback volume.

SHA-256 of the downloaded original:
`322103dd6ac5fae4872122f91d32cccd4d964b86d300585a5a0cdfaf7048af5d`

SHA-256 of `bossa-antigua.mp3`:
`e91e4182e70e1a71eccf1996a7e24e87ae874b2ee48624e1108dafe558e94166`

Processing command (FFmpeg, no paid services):

```sh
ffmpeg -i original.mp3 \
  -af 'loudnorm=I=-22:TP=-2:LRA=11:measured_I=-21.70:measured_TP=-3.14:measured_LRA=4.30:measured_thresh=-31.78:offset=-0.04:linear=true' \
  -ar 44100 -c:a libmp3lame -b:a 128k -map_metadata -1 \
  -metadata title='Bossa Antigua' -metadata artist='Kevin MacLeod' \
  -metadata copyright='Kevin MacLeod — CC BY 4.0 https://creativecommons.org/licenses/by/4.0/' \
  bossa-antigua.mp3
```

The site's visible BGM settings credit the title and artist, link to the track,
artist and license, and disclose normalization / compression / repeat playback.
Keep this credit and license notice when redistributing this recording.
