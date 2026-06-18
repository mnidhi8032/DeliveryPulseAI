"""Extract all 83 metrics from the QPM Excel sheet."""
import openpyxl, json, re

def parse_num(val):
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace(',', '')
    s = re.sub(r'[><=\s]', '', s)
    try:
        return float(s)
    except:
        return None

wb = openpyxl.load_workbook(
    r'C:\Users\chetannag.r\Desktop\demo_v2_threshold\OM-DEV-TM-71_QPM_Plan.xlsm',
    keep_vba=True, data_only=True
)
ws = wb['MetricsDefinition']

metrics = []
for row in ws.iter_rows(min_row=2, values_only=True):
    if not row[4]:
        continue
    metrics.append({
        'category': str(row[3] or '').strip(),
        'name': str(row[4] or '').strip(),
        'formula': str(row[8] or '').strip(),
        'uom': str(row[9] or '').strip(),
        'metrics_type': str(row[10] or '').strip(),  # Result / Enabler / Insight
        'intent': str(row[11] or '').strip(),          # Higher/Lower/Nominal/Within
        'project_type': str(row[12] or '').strip(),
        'delivery_model': str(row[13] or '').strip(),
        'project_category': str(row[14] or '').strip(),
        'frequency': str(row[17] or '').strip(),
        'compliance': str(row[19] or '').strip(),       # M=Mandatory, O=Optional, C=Conditional, R=Recommended
        'dashboard': str(row[20] or '').strip(),
        'governance_level': str(row[21] or '').strip(),
        'target': parse_num(row[24]),
        'lsl': parse_num(row[25]),
        'usl': parse_num(row[26]),
        'objective_type': str(row[0] or '').strip(),
        'org_goal': str(row[1] or '').strip(),
        'higher_objective': str(row[2] or '').strip(),
    })

out = r'C:\Users\chetannag.r\Desktop\demo_v2_threshold\demo_v2\backend\scripts\metrics_catalog.json'
with open(out, 'w', encoding='utf-8') as f:
    json.dump(metrics, f, indent=2, ensure_ascii=False)

print(f'Exported {len(metrics)} metrics to {out}')
cats = {}
for m in metrics:
    cats[m['category']] = cats.get(m['category'], 0) + 1
for k, v in sorted(cats.items()):
    print(f'  {k}: {v}')
