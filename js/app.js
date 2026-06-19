// js/app.js
const API_URL = "https://script.google.com/macros/s/AKfycbxF6cy4_Xd2I30ePPqQFF3qeYPn77CldMsewIzePotdsXsEvwdzX1QdWXPeiucfaVNU9Q/exec";
let currentViewData = [];
let cloudWeightsMap = {};

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

// เจาะลึกสแกนหาโครงข่าย (Network) ภายในโครงสร้างข้อมูลซับซ้อนของตัวแปร wbsDataByWbs
async function searchNetworkData() {
    const targetNetId = document.getElementById('network-input').value.trim();
    if (!targetNetId) return alert('กรุณาระบุรหัสโครงข่ายก่อนค้นหา');

    const tbody = document.getElementById('result-tbody');
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">⏳ กำลังโหลดตารางน้ำหนักพัสดุจากคลาวด์ Google Sheets...</td></tr>`;
    document.getElementById('result-card').classList.remove('hidden');

    try {
        // 1. ดึงค่าตารางน้ำหนักล่าสุดมาเตรียมจับชนข้อมูล
        const res = await fetch(`${API_URL}?action=get_all_weights`);
        const json = await res.json();
        cloudWeightsMap = {};
        if (json.status === 'success') {
            json.data.forEach(w => {
                cloudWeightsMap[w.materialCode] = { weight: w.weight, unit: w.unit };
            });
        }

        // 2. แกะข้อมูล WBS รายตัวเพื่อดึงรหัสโครงข่ายภายใน window.wbsDataByWbs (หรือ wbsDataByWbs) ที่มาจาก Python
        const dataContainer = typeof wbsDataByWbs !== 'undefined' ? wbsDataByWbs : (window.wbsDataByWbs || null);
        
        if (!dataContainer) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">❌ ไม่พบโครงสร้างข้อมูลในไฟล์ data.js กรุณาเช็กการรันของบอท</td></tr>`;
            return;
        }

        currentViewData = [];
        
        // วนลูปสแกนอ่านคีย์ WBS ทุกก้อน เพื่อกรองหาเฉพาะรายการที่มีรหัสโครงข่ายตรงตามที่ป้อน
        for (const wbsKey in dataContainer) {
            const records = dataContainer[wbsKey];
            if (Array.isArray(records)) {
                records.forEach(item => {
                    if (String(item.Network).trim() === targetNetId) {
                        currentViewData.push({
                            wbs: item.WBS,
                            materialCode: item['วัสดุ'], // อ้างอิงตามชื่อฟิลด์ภาษาไทยจาก Pandas Dataframe ดั้งเดิม
                            description: item.MatDesc,
                            qty: parseFloat(item.Qty) || 0
                        });
                    }
                });
            }
        }

        renderResultTable();

    } catch (e) {
        alert('ระบบดึงข้อมูลพัสดุขัดข้อง กรุณาตรวจสอบลิงก์สิทธิ์ของ Google Apps Script');
        console.error(e);
    }
}

// ขับเคลื่อนผลลัพธ์ออกตารางพร้อมคำนวณน้ำหนักสุทธิสุทธิ
function renderResultTable() {
    const tbody = document.getElementById('result-tbody');
    tbody.innerHTML = '';
    let grandTotal = 0;

    if (currentViewData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">❌ ไม่พบข้อมูลวัสดุพัสดุและองค์ประกอบ WBS สำหรับโครงข่ายนี้ในระบบข้อมูลดิบ</td></tr>`;
        document.getElementById('grand-total-val').innerText = '0.00';
        return;
    }

    currentViewData.forEach((item, index) => {
        const weightInfo = cloudWeightsMap[item.materialCode] || { weight: 0.00, unit: 'กก.' };
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

function removeItem(idx) {
    if(confirm('คุณต้องการลบพัสดุรายการนี้ออกจากการพิมพ์หน้ารายงานปัจจุบันใช่หรือไม่?')) {
        currentViewData.splice(idx, 1);
        renderResultTable();
    }
}

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
        alert('เชื่อมต่อฐานข้อมูลล้มเหลว');
    }
}

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
                        <td><button onclick="pullToEdit('${w.materialCode}', ${w.weight}, '${w.unit}')" style="background:#e2e8f0; border:none; padding:4px 8px; font-size:12px; cursor:pointer; border-radius:4px;">ดึงค่า</button></td>
                    </tr>
                `;
            });
        }
    } catch (e) { tbody.innerHTML = `<tr><td colspan="4">โหลดข้อมูลล้มเหลว</td></tr>`; }
}

function pullToEdit(code, weight, unit) {
    document.getElementById('form-code').value = code;
    document.getElementById('form-weight').value = weight;
    document.getElementById('form-unit').value = unit;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
