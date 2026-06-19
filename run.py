import os
import json
from datetime import datetime, timezone, timedelta

def read_sap_file(filepath):
    # ฟังก์ชันสลับรหัสภาษาเพื่อรองรับภาษาไทยจากระบบ SAP ทุกฟอร์แมต ป้องกันบอทแครช 100%
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
    input_file = "11.zmb25.txt"
    output_file = os.path.join("js", "data.js")
    
    if not os.path.exists(input_file):
        print(f"❌ Error: ไม่พบไฟล์ {input_file} ในระบบ")
        return

    print(f"⏳ เริ่มอ่านและล้างข้อมูลไฟล์ {input_file} (ไฟล์เดียวเน้นๆ)...")
    content = read_sap_file(input_file)
    
    clean_data = []
    lines = content.splitlines()
    
    for line in lines:
        line = line.strip()
        # คัดกรองเอาเฉพาะบรรทัดที่เป็นแถวข้อมูลจริงจากตาราง SAP
        if line.startswith('|') and not line.startswith('|-') and 'วัสดุ' not in line and 'การแสดงรายการ' not in line:
            columns = [col.strip() for col in line.split('|')[1:-1]]
            
            if len(columns) >= 11:
                clean_data.append({
                    "materialCode": columns[0],      # รหัสวัสดุ
                    "description": columns[1],       # คำอธิบายวัสดุ (รายชื่ออุปกรณ์)
                    "network": columns[4],           # รหัสโครงข่าย
                    "wbs": columns[5],               # องค์ประกอบ WBS
                    "diffQty": parse_float(columns[9]) # ปริมาณต่าง (รองรับคอมมาและค่าติดลบ)
                })

    # บันทึกเวลาที่อัปเดตระบบล่าสุดในโซนเวลาประเทศไทย
    tz_th = timezone(timedelta(hours=7))
    update_time = datetime.now(tz_th).strftime("%d/%m/%Y เวลา %H:%M น.")

    # ตรวจสอบและสร้างโฟลเดอร์ js/ ล่วงหน้าก่อนเขียนไฟล์
    os.makedirs("js", exist_ok=True)
    
    # แพ็กข้อมูลส่งเข้าสู่ Global Window Object เพื่อความเสถียรสูงสุดของเบราว์เซอร์
    js_content = f"""// ไฟล์นี้ถูกสร้างอัตโนมัติจาก Python (ห้ามแก้ไขด้วยมือ)
window.lastUpdated = "{update_time}";
window.sapData = {json.dumps(clean_data, ensure_ascii=False)};
"""

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(js_content)
        
    print(f"🎉 สำเร็จ! สร้างไฟล์ {output_file} เรียบร้อยแล้ว (พบข้อมูลโครงข่ายรวม {len(clean_data)} แถว)")

if __name__ == "__main__":
    main()
