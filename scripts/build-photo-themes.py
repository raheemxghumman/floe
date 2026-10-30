"""Turn curated free-licensed photos into floe photo themes.

Usage: python -I scripts/build-photo-themes.py <curation-dir> <picks.json>

<curation-dir> holds meta.json and cand/<theme>_<n>.jpg (from the curation step).
<picks.json> maps theme id -> {"n": candidate index, "focus"?: "50% 60%", "fx"?: [...]}.
Writes public/themes/<id>.webp (1920w) + <id>-t.webp (480w) and src/themelib/photos.ts."""
import html, json, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK, PICKS = sys.argv[1], sys.argv[2]
meta = json.load(open(os.path.join(WORK, 'meta.json'), encoding='utf-8'))
picks = json.load(open(PICKS, encoding='utf-8'))

# Living effects drawn over each photo. Themes with strong motion also appear under "Animated".
FX = {
    'lofi-clouds': ['fog', 'rays'], 'dusk-peak': ['stars', 'fog'], 'tuscan-village': ['dust', 'rays'],
    'cotton-candy-sky': ['fog', 'bokeh'], 'morning-sakura': ['petals', 'rays'], 'superbloom': ['petals', 'dust'],
    'winter-cabin': ['snow'], 'minimal-desert': ['dust'], 'fuji': ['fog', 'petals'], 'dune-night': ['stars'],
    'austrian-alps': ['fog', 'dust'], 'tropical-river': ['fog', 'rays'], 'lavender-field': ['fireflies', 'dust'],
    'western-town': ['dust'], 'capri-summer': ['rays', 'dust'], 'golden-gate-fog': ['fog'], 'dune-sunrise': ['dust', 'rays'],
    'outer-space': ['stars'], 'sakura-street': ['petals'], 'beach-sunset': ['rays', 'bokeh'], 'coastal-breeze': ['fog', 'rays'],
    'lake-como': ['dust', 'rays'], 'floe-hollow': ['dust', 'rays'], 'fall-central-park': ['dust', 'rays'],
    'countryside-morning': ['fog', 'rays'], 'lush-forest': ['rays', 'fireflies'], 'forest-retreat': ['fireflies', 'fog'],
    'countryside-night': ['stars', 'fireflies'], 'underwater-reef': ['bubbles', 'rays'], 'safari-sunset': ['dust', 'rays'],
    'wisdom-forest': ['rays', 'dust'], 'lofi-cafe': ['rain', 'bokeh'], 'eras': ['bokeh', 'flicker'], 'rainy-nyc': ['rain', 'bokeh'],
    'sunshine-plaza': ['dust', 'rays'], 'brooklyn-bridge': ['bokeh'], 'paris-cafe': ['bokeh', 'dust'], 'holiday-street': ['snow', 'bokeh'],
    'conservatory': ['rays', 'dust'], 'cozy-fireplace': ['embers', 'flicker'], 'cozy-kitchen': ['dust', 'rays'],
    'tokyo-commute': ['rays', 'dust'], 'arcade': ['bokeh', 'flicker'], 'cozy-cabin': ['embers', 'flicker'],
    'seoul-night-cafe': ['bokeh', 'rain'], 'dark-academia': ['dust', 'flicker'], 'lofi-bedroom': ['bokeh', 'rain'],
    'aquarium-tunnel': ['bubbles', 'rays'], 'first-class': ['fog'], 'morning-library': ['dust', 'rays'],
    'lush-bedroom': ['rays', 'dust'], 'drivers-seat': ['rain', 'bokeh'], 'cozy-desk': ['dust', 'rain'],
}
ANIMATED = {'rain', 'snow', 'embers', 'petals', 'bubbles'}
def clean(text, limit):
    # Wikimedia titles and creators sometimes carry markup, "File:" prefixes or file extensions
    text = html.unescape(re.sub(r'<[^>]+>', ' ', text or ''))
    text = re.sub(r'^(File|Image):', '', text.strip())
    text = re.sub(r'\.(jpe?g|png|tiff?|webp)$', '', text, flags=re.I)
    return re.sub(r'\s+', ' ', text).strip()[:limit]

LICENSE_LABEL = {'cc0': 'CC0', 'pdm': 'Public Domain', 'by': 'CC BY', 'by-sa': 'CC BY-SA'}

out_dir = os.path.join(ROOT, 'public', 'themes')
os.makedirs(out_dir, exist_ok=True)
themes = []
for tid, m in meta.items():
    pick = picks.get(tid)
    if not pick:
        continue
    cand = next((c for c in m['candidates'] if c['n'] == pick['n']), None)
    if not cand:
        print('skip', tid, '(candidate missing)')
        continue
    im = Image.open(os.path.join(WORK, 'cand', f"{tid}_{pick['n']}.jpg")).convert('RGB')
    big = im.copy(); big.thumbnail((1920, 1920), Image.LANCZOS)
    big.save(os.path.join(out_dir, f'{tid}.webp'), 'WEBP', quality=78, method=6)
    small = im.copy(); small.thumbnail((480, 480), Image.LANCZOS)
    small.save(os.path.join(out_dir, f'{tid}-t.webp'), 'WEBP', quality=72, method=6)
    fx = pick.get('fx', FX.get(tid, []))
    cats = [m['category']] + (['animated'] if any((f if isinstance(f, str) else f['fx']) in ANIMATED for f in fx) else [])
    lic = LICENSE_LABEL.get(cand['license'], cand['license'].upper())
    if cand.get('license_version') and cand['license'] not in ('cc0', 'pdm'):
        lic += ' ' + cand['license_version']
    theme = {'id': tid, 'name': pick.get('name', m['name']), 'kind': 'photo', 'src': f'/themes/{tid}.webp', 'thumb': f'/themes/{tid}-t.webp',
             'fx': fx, 'cats': cats,
             'credit': {'title': clean(cand.get('title'), 80) or 'Untitled', 'author': clean(cand.get('creator'), 60) or 'Unknown',
                        'license': lic, 'url': cand.get('landing') or ''}}
    if pick.get('focus'):
        theme['focus'] = pick['focus']
    if pick.get('tone'):
        theme['tone'] = pick['tone']
    themes.append(theme)

order = {c: i for i, c in enumerate(['scenic', 'nature', 'urban', 'interior'])}
themes.sort(key=lambda t: order.get(t['cats'][0], 9))
body = ',\n'.join('  ' + json.dumps(t, ensure_ascii=False) for t in themes)
ts = ('// Generated by scripts/build-photo-themes.py from the curated photo list. Do not edit by hand.\n'
      "import type { ThemeDef } from '../themes'\n\n"
      f'export const PHOTO_THEMES: ThemeDef[] = [\n{body},\n]\n')
open(os.path.join(ROOT, 'src', 'themelib', 'photos.ts'), 'w', encoding='utf-8').write(ts)
size = sum(os.path.getsize(os.path.join(out_dir, f)) for f in os.listdir(out_dir))
print(f'{len(themes)} photo themes, {size / 1e6:.1f} MB in public/themes')
