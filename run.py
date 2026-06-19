import os
import json

def process_sap_text(filepath):
    parsed_records = []
    if not os.path.exists(filepath):
        print(f"Error: {filepath} not found.")
        return parsed_records
        
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            # คัดเฉพาะแถวที่เป็นข้อมูลจริงที่มีสัญลักษณ์ตาราง SAP
            if line.startswith('|') and not line.startswith('|-') and 'วัสดุ' not in line and 'การแสดงรายการ' not in line:
                columns = [col.strip() for col in line.split('|')[1:-1]]
                
                if len(columns) >= 11:
                    parsed_records.append({
                        "materialCode": columns[0],   # รหัสวัสดุ
                        "description": columns[1],    # รายชื่ออุปกรณ์
                        "network": columns[4],        # โครงข่าย
                        "wbs": columns[5],            # องค์ประกอบ WBS
                        "diffQty": float(columns[9].replace(',', '')) if columns[9].replace(',', '').replace('.', '', 1).isdigit() else 0  # ปริมาณต่าง
                    })
    return parsed_records

if __name__ == "__main__":
    input_file = "11.zmb25.txt"
    print(f"⏳ เริ่มการประมวลผลไฟล์ {input_file}...")
    
    clean_data = process_sap_text(input_file)
    
    # ตรวจสอบและสร้างโฟลเดอร์ js ถ้ายังไม่มีในระบบ
    os.makedirs("js", exist_ok=True)
    
    # เขียนบันทึกเป็นไฟล์ JavaScript Object เพื่อให้หน้าเว็บดึงไปโหลดแบบเรียลไทม์
    output_path = "js/data.js"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(f"window.sapData = {json.dumps(clean_data, ensure_ascii=False)};")
        
    print(f"🎉 สำเร็จ! สร้างไฟล์ {output_path} เรียบร้อยแล้ว จำนวน {len(clean_data)} รายการ")
