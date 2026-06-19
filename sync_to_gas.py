import os
import requests
import json

# URL ของ Google Apps Script Web App (รับค่าจาก GitHub Secrets ปลอดภัย 100%)
GAS_API_URL = os.environ.get("GAS_API_URL")

def process_sap_text(filepath):
    clean_data = []
    
    # อ่านไฟล์ txt (รองรับภาษาไทย)
    with open(filepath, 'r', encoding='utf-8') as file:
        for line in file:
            line = line.strip()
            # กรองเอาเฉพาะบรรทัดที่เป็นข้อมูลจริง (ขึ้นต้นด้วย | และไม่ใช่บรรทัดหัวตาราง/เส้นคั่น)
            if line.startswith('|') and not line.startswith('|-') and 'วัสดุ' not in line:
                # แยกคอลัมน์ด้วย | และลบช่องว่างหัวท้ายของแต่ละช่อง
                columns = [col.strip() for col in line.split('|')[1:-1]]
                
                # ตรวจสอบว่าคอลัมน์ครบถ้วนตามแบบฟอร์ม (11 คอลัมน์)
                if len(columns) >= 11:
                    clean_data.append(columns)
                    
    return clean_data

def main():
    filepath = "11.zmb25.txt"
    
    if not os.path.exists(filepath):
        print(f"❌ ไม่พบไฟล์ {filepath} ในระบบ")
        return

    print("⏳ กำลังอ่านและทำความสะอาดข้อมูล...")
    data = process_sap_text(filepath)
    
    if not data:
        print("⚠️ ไม่พบข้อมูลที่ถูกต้องในไฟล์")
        return
        
    print(f"✅ คลีนข้อมูลสำเร็จ จำนวน {len(data)} รายการ")
    print("🚀 กำลังส่งข้อมูลไปยัง Google Apps Script API...")

    # สร้าง Payload ส่งไปยัง GAS แบบ Batch
    payload = {
        "action": "sync_raw_data",
        "data": data
    }

    try:
        response = requests.post(GAS_API_URL, json=payload)
        result = response.json()
        if result.get('status') == 'success':
            print("🎉 ส่งข้อมูลเข้า Google Sheets สำเร็จเรียบร้อย!")
        else:
            print(f"❌ GAS แจ้งข้อผิดพลาด: {result.get('message')}")
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาดในการเชื่อมต่อ API: {str(e)}")

if __name__ == "__main__":
    main()
