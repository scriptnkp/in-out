import os
import json
from datetime import datetime, timezone, timedelta

def read_sap_file(filepath):
    encodings = ['utf-8', 'utf-8-sig', 'tis-620', 'cp874']
    for enc in encodings:
        try:
            with open(filepath, 'r', encoding=enc) as f:
                return f.read()
        except UnicodeDecodeError:
            continue
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()

def parse_float(val):
    try:
        return float(val.replace(',', '').strip())
    except ValueError:
        return 0.0

def main():
    file_zmb25 = "11.zmb25.txt"
    file_weight = "น้ำหนัก.txt"
    output_file = os.path.join("js", "data.js")
    
    if not os.path.exists(file_zmb25):
        print(f"❌ Error: ไม่พบไฟล์โครงข่าย {file_zmb25}")
        return
    if not os.path.exists(file_weight):
        print(f"❌ Error: ไม่พบไฟล์ตารางน้ำหนัก {file_weight}")
        return

    print(f"⏳ เริ่มกระมวลผลควบคู่ 2 ไฟล์: {file_zmb25} และ {file_weight}...")
    
    content_zmb = read_sap_file(file_zmb25)
    clean_sap = []
    for line in content_zmb.splitlines():
        line = line.strip()
        if line.startswith('|') and not line.startswith('|-') and 'วัสดุ' not in line and 'การแสดงรายการ' not in line:
            columns = [col.strip() for col in line.split('|')[1:-1]]
            if len(columns) >= 11:
                clean_sap.append({
                    "materialCode": columns[0],      
                    "description": columns[1],       
                    "network": columns[4],           
                    "wbs": columns[5],               
                    "reqQty": parse_float(columns[7]), # 🟢 ปริมาณความต้องการ (ปม.ต้องการ)
                    "diffQty": parse_float(columns[9]) # 🟢 เก็บปริมาณต่างไว้สำรองกันแครช
                })

    content_weight = read_sap_file(file_weight)
    clean_weights = {}
    for line in content_weight.splitlines():
        line = line.strip()
        if '|' in line and 'รหัสพัสดุ' not in line:
            parts = [p.strip() for p in line.split('|')]
            if len(parts) >= 3:
                mat_code = parts[0]
                desc = parts[1].replace('"', '').strip() 
                weight_val = parse_float(parts[2])
                unit_val = parts[3] if len(parts) > 3 else "กก."
                
                clean_weights[mat_code] = {
                    "weight": weight_val,
                    "unit": unit_val,
                    "description": desc
                }

    tz_th = timezone(timedelta(hours=7))
    update_time = datetime.now(tz_th).strftime("%d/%m/%Y เวลา %H:%M น.")

    os.makedirs("js", exist_ok=True)
    
    js_content = f"""// ไฟล์นี้ถูกสร้างอัตโนมัติจาก Python (ห้ามแก้ไขด้วยมือ)
window.lastUpdated = "{update_time}";
window.sapData = {json.dumps(clean_sap, ensure_ascii=False)};
window.weightData = {json.dumps(clean_weights, ensure_ascii=False)};
"""

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(js_content)
        
    print(f"🎉 สำเร็จลุล่วง! บอทสร้างไฟล์ความเร็วสูงไว้ที่ {output_file} เรียบร้อยแล้ว")

if __name__ == "__main__":
    main()