// js/app.js
const API_URL = "https://script.google.com/macros/s/AKfycbxF6cy4_Xd2I30ePPqQFF3qeYPn77CldMsewIzePotdsXsEvwdzX1QdWXPeiucfaVNU9Q/exec";
let currentViewData = [];
let cloudWeightsMap = {};

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// เจาะค้นหาโครงข่ายจากตัวแปร wbsDataByWbs ของสคริปต์ Python
async function searchNetworkData() {
    const targetNetId = document.getElementById('network-input').value.trim();
    if (!targetNetId) return alert('กรุณาระบุรหัสโครงข่ายก่อนค้นหา');

    const tbody = document.getElementById('result-tbody');
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">⏳ กำลังโหลดตารางน้ำหนักอุปกรณ์จากคลาวด์...</td></tr>`;
    document.getElementById('result-card').classList.remove('hidden');

    try {
        // 1. ดึงข้อมูลน้ำหนักปัจจุบันจาก Google Sheets มารอไว้
        const res = await fetch(`${API_URL}?action=get_all_weights`);
        const json = await res.json();
        cloudWeightsMap = {};
        if (json.status === 'success') {
            json.data.forEach(w => {
                cloudWeightsMap[w.materialCode] = { weight: w.weight, unit: w.unit };
            });
        }

        // 2. ค้นหาและคัดกรองข้อมูลจากไฟล์ data.js (สแกนผ่าน wbsDataByWbs)
        if (typeof wbsDataByWbs === 'undefined') {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">❌ ไม่พบตัวแปรฐานข้อมูลในไฟล์ data.js กรุณาเช็กบอท GitHub</td></tr>`;
            return;
        }

        currentViewData = [];
        // วนลูปอ่านข้อมูลทุก WBS เพื่อแกะหาโครงข่าย (Network) ที่ตรงกัน
        for (const wbsKey in wbsDataByWbs) {
            const records = wbsDataByWbs[wbsKey];
            records.forEach(item => {
                if (String(item.Network).trim() === targetNetId) {
                    currentViewData.push({
                        wbs: item.WBS,
                        materialCode: item['วัสดุ'],
                        description: item.MatDesc,
                        qty: parseFloat(item.Qty) || 0
                    });
                }
            });
        }

        renderResultTable();

    } catch (e) {
        alert('เกิดข้อผิดพลาดในการดึงข้อมูลจากหลังบ้าน');
        console.error(e);
    }
}

// วาดตารางข้อมูลและคำนวณผลรวมน้ำหนักสุทธิ
function renderResultTable() {
    const tbody = document.getElementById('result-tbody');
    tbody.innerHTML = '';
    let grandTotal = 0;

    if (currentViewData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">❌ ไม่พบข้อมูลวัสดุและ WBS ภายใต้โครงข่ายนี้</td></tr>`;
        document.getElementById('grand-total-val').innerText = '0.00';
        return;
    }

    currentViewData.forEach((item, index) => {
        // ผูกชนข้อมูลพัสดุเข้ากับคลาวด์น้ำหนัก
        const weightInfo = cloudWeightsMap[item.materialCode] || { weight: 0.00, unit: 'หน่วย' };
        const totalRowWeight = item.qty * weightInfo.weight;
        grandTotal += totalRowWeight;

        tbody.innerHTML += `
            <tr>
                <td>${item.wbs}</td>
                <td style="font-weight:600;">${item.materialCode}</td>
                <td>${item.description}</td>
                <td class="num">${item.qty.toLocaleString()}</td>
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

// ลบรายการแถวที่ไม่ต้องการออกชั่วคราวก่อนกดพิมพ์รายงาน
function removeItem(idx) {
    currentViewData.splice(idx, 1);
    renderResultTable();
}

// บันทึกการอัปเดตน้ำหนักส่งกลับไปที่ Google Sheets
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
            alert('บันทึกปรับปรุงน้ำหนักลง Google Sheets เรียบร้อย!');
            document.getElementById('weight-form').reset();
            loadWeightTable();
        }
    } catch (err) {
        alert('อัปเดตน้ำหนักล้มเหลว');
    }
}

// โหลดข้อมูลน้ำหนักทั้งหมดมาแสดงในตารางหน้า Settings
async function loadWeightTable() {
    const tbody = document.getElementById('weight-list-tbody');
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">กำลังโหลดข้อมูลน้ำหนักพัสดุจากระบบคลาวด์...</td></tr>`;
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
    } catch (e) { tbody.innerHTML = `<tr><td colspan="4">โหลดล้มเหลว</td></tr>`; }
}

function pullToEdit(code, weight, unit) {
    document.getElementById('form-code').value = code;
    document.getElementById('form-weight').value = weight;
    document.getElementById('form-unit').value = unit;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
