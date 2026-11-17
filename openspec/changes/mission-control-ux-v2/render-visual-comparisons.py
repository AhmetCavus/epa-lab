"""Compose unmasked native-pixel review artifacts from actual browser captures."""
from pathlib import Path
from hashlib import sha256
import json
from PIL import Image

change = Path(__file__).resolve().parent
references = change.parents[2] / 'docs/design/mission-control-v2'
evidence = change / 'evidence'
pairs = [
    ('00-current-navy-baseline.png', '06-00-navy.png'),
    ('01-explore.png', '06-01-explore.png'),
    ('02-inspect.png', '06-02-inspect.png'),
    ('03-animated-flow.png', '06-03-animated-flow.png'),
    ('04-resource-explorer.png', '06-04-resource-explorer.png'),
]
records = []
sections = []
for reference, capture in pairs:
    expected = Image.open(references / reference).convert('RGB')
    actual = Image.open(evidence / capture).convert('RGB')
    assert expected.size == actual.size
    width, height = expected.size
    stem = reference.removesuffix('.png')
    comparison = Image.new('RGB', (width * 2, height))
    comparison.paste(expected, (0, 0))
    comparison.paste(actual, (width, 0))
    comparison.save(evidence / f'{stem}-comparison.png')
    Image.blend(expected, actual, 0.5).save(evidence / f'{stem}-overlay.png')
    records.append({
        'reference': reference, 'capture': capture, 'size': expected.size,
        'referenceSha256': sha256((references / reference).read_bytes()).hexdigest(),
        'captureSha256': sha256((evidence / capture).read_bytes()).hexdigest(),
        'sideBySide': f'{stem}-comparison.png', 'overlay': f'{stem}-overlay.png',
        'maskedPixels': 0, 'resizedPixels': 0,
        'referenceCorner': expected.getpixel((width - 5, height - 5)),
        'captureCorner': actual.getpixel((width - 5, height - 5)),
    })
    sections.append(f'''<section><h2>{reference} · {width}×{height}</h2>
<p><a href="{stem}-comparison.png">Native side-by-side</a> · <a href="{stem}-overlay.png">50% overlay</a> · <a href="{capture}">Implementation</a></p>
<div class="pair"><figure><figcaption>Approved reference</figcaption><img src="../../../../docs/design/mission-control-v2/{reference}" alt="Approved {stem}"></figure>
<figure><figcaption>Actual browser capture</figcaption><img src="{capture}" alt="Implemented {stem}"></figure></div>
<details><summary>Interactive overlay</summary><label>Implementation opacity <input type="range" min="0" max="1" step="0.05" value="0.5" oninput="this.closest('details').querySelector('.overlay-actual').style.opacity=this.value"></label>
<div class="overlay"><img src="../../../../docs/design/mission-control-v2/{reference}" alt="Approved reference"><img class="overlay-actual" src="{capture}" alt="Actual capture overlay"></div></details></section>''')
(evidence / 'visual-comparison-index.json').write_text(json.dumps(records, indent=2) + '\n')
(evidence / 'visual-comparison.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mission Control v2 visual review</title>
<style>body{margin:24px;background:#080e20;color:#eef5ff;font:16px system-ui}a{color:#70d4ff}section{margin:40px 0;border-top:1px solid #54769d;padding-top:16px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}figcaption{margin:8px 0;color:#bcd0e8}img{display:block;width:100%;height:auto}summary{cursor:pointer;margin:16px 0}.overlay{position:relative;margin-top:16px}.overlay-actual{position:absolute;inset:0;opacity:.5}input{width:240px;max-width:60vw}a:focus-visible,summary:focus-visible,input:focus-visible{outline:3px solid #80e6ff;outline-offset:4px}</style>
<h1>Mission Control v2: actual visual comparison</h1><p>Synthetic browser-fixture evidence, not an observation of public OAuth. Each PNG retains native reference dimensions with no masks, resizing or generated replacement pixels. This review page fits images to the window; open a PNG to inspect native pixels.</p>
<p>The portrait baseline compares identity/palette. Its responsive full page extends below the captured viewport; document height is recorded in its JSON metrics. The four desktop captures fit their complete viewport.</p>
''' + '\n'.join(sections) + '</html>')
print(f'Created {len(records)} unmasked native comparison pairs.')
