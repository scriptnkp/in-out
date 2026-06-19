// ดึงลิงก์ API เดิมของคุณมาทำงานร่วมกับตาราง Weights
const API_URL = "https://script.google.com/macros/s/AKfycbxF6cy4_Xd2I30ePPqQFF3qeYPn77CldMsewIzePotdsXsEvwdzX1QdWXPeiucfaVNU9Q/exec";
let filteredData = [];
let globalWeights = {};

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// ค้นหาและคำนวณแบบ Client-side Real-time ลื่นปรื๊ดระดับมิลลิวินาที
async function searchNetwork() {
    const netId = document.getElementById('network-input').value.trim();
    if (!netId) return alert('กรุณากรอกรหัสโครงข่าย');

    const tbody = document.getElementById('result-tbody');
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">⏳ กำลังจับคู่น้ำหนักพัสดุจากคลาวด์ฐานข้อมูล...</td></tr>`;
    document.getElementById('report-section').classList.remove('hidden');

    try {
        // 1. ดึงข้อมูลตารางน้ำหนักล่าสุดจาก Google Sheets มาอมไว้ก่อน
        const res = await fetch(`${API_URL}?action=get_all_weights`);
        const json = await res.json();
        
        globalWeights = {};
        if (json.status === 'success') {
            json.data.forEach(w => {
                globalWeights[w.materialCode] = { weight: w.weight, unit: w.unit };
            });
        }

        // 2. กรองข้อมูลโครงข่ายจาก window.sapData ที่ดึงมาจาก GitHub โดยตรง
        if (!window.sapData) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">❌ ไม่พบฐานข้อมูลดิบ กรุณาตรวจสอบการรันใน GitHub</td></tr>`;
            return;
        }

        filteredData = window.sapData.filter(item => String(item.network).trim() === netId);
        renderOutputTable();

    } catch (e) {
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อระบบฐานข้อมูลคลาวด์');
        console.error(e);
    }
}

function renderOutputTable() {
    const tbody = document.getElementById('result-tbody');
    tbody.innerHTML = '';
    let totalWeight = 0;

    if (filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">❌ ไม่พบรายการวัสดุภายใต้รหัสโครงข่ายนี้</td></tr>`;
        document.getElementById('grand-total-val').innerText = '0.00';
        return;
    }

    filteredData.forEach((item, index) => {
        // วิ่งไปจับคู่น้ำหนักจากแผ่นงาน Weights ใน Google Sheets ที่โหลดมา
        const weightInfo = globalWeights[item.materialCode] || { weight: 0, unit: 'กก.' };
        const rowWeight = item.diffQty * weightInfo.weight;
        totalWeight += rowWeight;

        tbody.innerHTML += `
            <tr>
                <td>${item.wbs}</td>
                <td style="font-weight:600;">${item.materialCode}</td>
                <td>${item.description}</td>
                <td class="num">${item.diffQty.toLocaleString()}</td>
                <td class="num">${weightInfo.weight.toFixed(3)}</td>
                <td>${weightInfo.unit}</td>
                <td class="num bold">${rowWeight.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td class="action-col" style="text-align:center;">
                    <button onclick="deleteRow(${index})" style="background:#ef4444; color:white; padding:3px 8px; font-size:13px; border-radius:4px;">ลบ</button>
                </td>
            </tr>
        `;
    });

    document.getElementById('grand-total-val').innerText = totalWeight.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// ลบรายการที่ไม่ต้องการทิ้งชั่วคราวก่อนกดพิมพ์รายงาน
function deleteRow(idx) {
    filteredData.splice(idx, 1);
    renderOutputTable();
}

// ฟังก์ชันหน้าตั้งค่าน้ำหนัก: ส่งค่าไปเซฟลง Google Sheets Database
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
            alert('บันทึกข้อมูลน้ำหนักลง Google Sheets สำเร็จ!');
            document.getElementById('weight-form').reset();
            loadWeightTable();
        }
    } catch (err) {
        alert('บันทึกข้อมูลล้มเหลว');
    }
}

async function loadWeightTable() {
    const tbody = document.getElementById('weight-list-tbody');
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">กำลังดึงรายการจาก Google Sheets...</td></tr>`;
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
                        <td><button onclick="pullToEdit('${w.materialCode}', ${w.weight}, '${w.unit}')" style="background:#e2e8f0; padding:4px 8px; font-size:12px;">แก้ไข</button></td>
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
