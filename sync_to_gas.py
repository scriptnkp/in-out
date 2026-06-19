import requests
import os

# ลิงก์ API ของคุณ
API_URL = "https://script.google.com/macros/s/AKfycbxF6cy4_Xd2I30ePPqQFF3qeYPn77CldMsewIzePotdsXsEvwdzX1QdWXPeiucfaVNU9Q/exec"

def process_sap_text(filepath):
    data = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line.startswith('|') and not line.startswith('|-') and 'วัสดุ' not in line:
                cols = [col.strip() for col in line.split('|')[1:-1]]
                if len(cols) >= 11: data.append(cols)
    return data

if __name__ == "__main__":
    filepath = "11.zmb25.txt"
    if os.path.exists(filepath):
        data = process_sap_text(filepath)
        if data:
            res = requests.post(API_URL, json={"action": "sync_raw_data", "data": data})
            print(res.text)
    else:
        print("ไม่พบไฟล์ 11.zmb25.txt")
