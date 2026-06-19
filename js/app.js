// js/app.js
// ลิงก์ Web App API ของพี่ (สำหรับติดต่อกับตาราง Weights ใน Google Sheets)
const API_URL = "https://script.google.com/macros/s/AKfycbxF6cy4_Xd2I30ePPqQFF3qeYPn77CldMsewIzePotdsXsEvwdzX1QdWXPeiucfaVNU9Q/exec";
let currentViewData = [];
let cloudWeightsMap = {};

// ฟังก์ชันสลับหน้าแท็บ (ตรวจสอบโครงข่าย / ตั้งค่าน้ำหนัก)
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

// ค้นหาและคำนวณน้ำหนักรายโครงข่ายแบบ Real-time
async function searchNetworkData() {
    const targetNetId = document.getElementById('network-input').value.trim();
    if (!targetNetId) return alert('กรุณาระบุรหัสโครงข่ายก่อนค้นหา');

    const tbody = document.getElementById('result-tbody');
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">⏳ กำลังดึงตารางน้ำหนักอุปกรณ์พัสดุล่าสุดจาก Google Sheets...</td></tr>`;
    document.getElementById('result-card').classList.remove('hidden');

    try {
        // 1. ดึงข้อมูลตารางน้ำหนักล่าสุดจากหน้าตาราง Weights ใน Google Sheets มารอไว้
        const res = await fetch(`${API_URL}?action=get_all_weights`);
        const json = await res.json();
        cloudWeightsMap = {};
        if (json.status === 'success') {
            json.data.forEach(w => {
                cloudWeightsMap[w.materialCode] = { weight: w.weight, unit: w.unit };
            });
        }

        // 2. ตรวจสอบข้อมูลโครงข่ายพัสดุที่ถูกสร้างมาจากสคริปต์ Python (window.sapData)
        if (typeof window.sapData === 'undefined') {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">❌ ไม่พบตัวแปรฐานข้อมูลในไฟล์ data.js กรุณาเช็กการรันใน GitHub</td></tr>`;
            return;
        }

        // ทำการกรอง (Filter) ข้อมูล โดยจับคู่รหัสโครงข่ายตรงๆ ตามคีย์ที่ Python ปล่อยออกมา
        currentViewData = window.sapData.filter(item => String(item.network).trim() === targetNetId);
        renderResultTable();

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">❌ เกิดข้อผิดพลาดในการเชื่อมต่อระบบฐานข้อมูลคลาวด์</td></tr>`;
        console.error(e);
    }
}

// วาดตารางข้อมูลและคำนวณผลรวมน้ำหนักสุทธิสุทธิ
function renderResultTable() {
    const tbody = document.getElementById('result-tbody');
    tbody.innerHTML = '';
    let grandTotal = 0;

    if (currentViewData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">❌ ไม่พบข้อมูลวัสดุพัสดุสำหรับรหัสโครงข่ายนี้</td></tr>`;
        document.getElementById('grand-total-val').innerText = '0.00';
        return;
    }

    currentViewData.forEach((item, index) => {
        // วิ่งไปจับคู่น้ำหนักจาก Google Sheets โดยใช้รหัสพัสดุเป็นตัวชน
        const weightInfo = cloudWeightsMap[item.materialCode] || { weight: 0.00, unit: 'กก.' };
        const totalRowWeight = item.diffQty * weightInfo.weight;
        grandTotal += totalRowWeight;

        tbody.innerHTML += `
            <tr>
                <td>${item.wbs}</td>
                <td style="font-weight:600;">${item.materialCode}</td>
                <td>${item.description}</td>
                <td class="num">${item.diffQty.toLocaleString()}</td>
                <td class="num">${weightInfo.weight.toFixed(3)}</td>
                <td>${weightInfo.unit}</td>
                <td class="num bold">${totalRowWeight.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td class="action-col" style="text-align:center;">
                    <button onclick="removeItem(${index})" style="background:#dc2626; color:white; padding:3px 8px; border:none; border-radius:4px; cursor:pointer;">ลบ</button>
                </td>
            </tr>
        `;
    });

    document.getElementById('grand-total-val').innerText = grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// ลบแถวพัสดุที่ไม่ต้องการออกชั่วคราวก่อนกดพิมพ์รายงาน ออกกระดาษ A4
function removeItem(idx) {
    if(confirm('คุณต้องการลบพัสดุรายการนี้ออกจากการพิมพ์รายงานปัจจุบันใช่หรือไม่?')) {
        currentViewData.splice(idx, 1);
        renderResultTable();
    }
}

// ส่วนหน้าตั้งค่า: บันทึกและส่งค่าน้ำหนักใหม่กลับไปอัปเดตที่ Google Sheets
async function saveWeight(e) {
    e.preventDefault();
    const materialCode = document.getElementById('form-code').value.trim();
    const weight = parseFloat(document.getElementById('form-weight').value);
    const unit = document.getElementById('form-unit').value.trim();

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'update_weight', materialCode, weight, unit })
        });
        const json = await res.json();
        if (json.status === 'success') {
            alert('บันทึกปรับปรุงข้อมูลน้ำหนักลงฐานข้อมูล Google Sheets สำเร็จ!');
            document.getElementById('weight-form').reset();
            loadWeightTable();
        }
    } catch (err) {
        alert('เชื่อมต่อฐานข้อมูล Google ล้มเหลว');
    }
}

// โหลดรายการน้ำหนักพัสดุทั้งหมดจาก Google Sheets มาแสดงในหน้าตั้งค่า
async function loadWeightTable() {
    const tbody = document.getElementById('weight-list-tbody');
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">กำลังโหลดรายการน้ำหนักวัสดุจากระบบคลาวด์...</td></tr>`;
    try {
        const res = await fetch(`${API_URL}?action=get_all_weights`);
        const json = await res.json();
        if (json.status === 'success') {
            tbody.innerHTML = '';
            json.data.forEach(w => {
                tbody.innerHTML += `
                    <tr>
                        <td>${w.materialCode}</td>
                        <td class="bold">${w.weight}</td>
                        <td>${w.unit}</td>
                        <td><button onclick="pullToEdit('${w.materialCode}', ${w.weight}, '${w.unit}')" style="background:#e2e8f0; border:none; padding:4px 8px; font-size:12px; cursor:pointer; border-radius:4px;">แก้ไข</button></td>
                    </tr>
                `;
            });
        }
    } catch (e) { tbody.innerHTML = `<tr><td colspan="4">โหลดข้อมูลล้มเหลว</td></tr>`; }
}

// ดึงค่าน้ำหนักจากตารางขึ้นไปเติมบนฟอร์มเพื่อแก้ไขด่วน
function pullToEdit(code, weight, unit) {
    document.getElementById('form-code').value = code;
    document.getElementById('form-weight').value = weight;
    document.getElementById('form-unit').value = unit;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
