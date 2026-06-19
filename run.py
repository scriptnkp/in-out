import os
import json

def read_sap_file(filepath):
    # รองรับการเปิดอ่านไฟล์ทุกฟอร์แมตภาษาไทยจาก SAP ป้องกันสคริปต์บึ้ม 100%
    encodings = ['utf-8', 'utf-8-sig', 'tis-620', 'cp874']
    for enc in encodings:
        try:
            with open(filepath, 'r', encoding=enc) as f:
                return f.read()
        except UnicodeDecodeError:
            continue
    # ทางเลือกสุดท้ายถ้าถอดรหัสไม่ได้จริงๆ ให้ข้ามตัวอักษรแปลกปลอม
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()

def parse_float(val):
    try:
        return float(val.replace(',', '').strip())
    except ValueError:
        return 0.0

def main():
    input_file = "11.zmb25.txt"
    output_file = "data.js" # ปรับมาสร้างที่ Root ตามตัวอย่างที่รันผ่านของคุณ
    
    if not os.path.exists(input_file):
        print(f"❌ Error: ไม่พบไฟล์ {input_file}")
        return

    print(f"⏳ เริ่มอ่านและล้างข้อมูลไฟล์ {input_file}...")
    content = read_sap_file(input_file)
    
    clean_data = []
    lines = content.splitlines()
    
    for line in lines:
        line = line.strip()
        # คัดกรองบรรทัดข้อมูลจริงของตาราง SAP
        if line.startswith('|') and not line.startswith('|-') and 'วัสดุ' not in line and 'การแสดงรายการ' not in line:
            columns = [col.strip() for col in line.split('|')[1:-1]]
            
            if len(columns) >= 11:
                clean_data.append({
                    "materialCode": columns[0], 
                    "description": columns[1],  
                    "network": columns[4],      
                    "wbs": columns[5],          
                    "diffQty": parse_float(columns[9]) # จัดการตัวเลขและค่าติดลบอย่างแม่นยำ
                })

    # เขียนไฟล์ลง Root ตามโครงสร้างเดิมที่บอทชอบ
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(f"window.sapData = {json.dumps(clean_data, ensure_ascii=False)};")
        
    print(f"🎉 สำเร็จ! หุ่นยนต์สร้างไฟล์ {output_file} เรียบร้อยแล้ว (พบข้อมูล {len(clean_data)} รายการ)")

if __name__ == "__main__":
    main()
