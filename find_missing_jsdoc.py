import os

files_to_check = []
for d in ['server/middleware', 'server/services', 'server/routes']:
    for f in os.listdir(d):
        if f.endswith('.ts'):
            files_to_check.append(os.path.join(d, f))

for filepath in sorted(files_to_check):
    with open(filepath) as f:
        lines = f.readlines()
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('export ') and not stripped.startswith('export {') and not stripped.startswith('export default') and not stripped.startswith('export type') and not stripped.startswith('export interface'):
            has_jsdoc = False
            for j in range(i-1, max(i-5, -1), -1):
                prev = lines[j].strip()
                if prev == '':
                    continue
                if prev.endswith('*/'):
                    has_jsdoc = True
                break
            if not has_jsdoc:
                print(f'{filepath}:{i+1}: {stripped[:90]}')
