// js/app.js
const API_URL = "https://script.google.com/macros/s/AKfycbxF6cy4_Xd2I30ePPqQFF3qeYPn77CldMsewIzePotdsXsEvwdzX1QdWXPeiucfaVNU9Q/exec";
let currentViewData = [];
let cloudWeightsMap = {};

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
}

// ระบบค้นหาอัจฉริยะแบบ Hybrid ความเร็วสูง ปลอดภัยจากปัญหาเน็ตบล็อก CORS
async function searchNetworkData() {
    const targetNetId = document.getElementById('network-input').value.trim();
    if (!targetNetId) return alert('กรุณาระบุรหัสโครงข่ายก่อนค้นหา');

    const tbody = document.getElementById('result-tbody');
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">⏳ กำลังประมวลผลจับคู่พัสดุและน้ำหนักอุปกรณ์...</td></tr>`;
    document.getElementById('result-card').classList.remove('hidden');

    // 1. พยายามดึงข้อมูลน้ำหนักสดจาก Google Sheets มาเป็นตัวเลือกแรก (ถ้าเน็ตไม่บล็อก)
    try {
        const res = await fetch(`${API_URL}?action=get_all_weights`);
        const json = await res.json();
        if (json.status === 'success') {
            json.data.forEach(w => {
                cloudWeightsMap[w.materialCode] = { weight: w.weight, unit: w.unit };
            });
        }
    } catch (e) {
        console.log("⚠️ หมายเหตุ: เน็ตองค์กรบล็อก Google Sheets ระบบจะสลับไปใช้น้ำหนักเริ่มต้นจาก GitHub อัตโนมัติ");
    }

    // 2. ตรวจสอบข้อมูลโครงข่ายพัสดุหลักจาก window.sapData
    if (typeof window.sapData === 'undefined') {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">❌ ไม่พบฐานข้อมูลโครงข่ายพัสดุในไฟล์ data.js</td></tr>`;
        return;
    }

    // กรองรหัสโครงข่ายแสดงผลทันที
    currentViewData = window.sapData.filter(item => String(item.network).trim() === targetNetId);
    renderResultTable();
}

function renderResultTable() {
    const tbody = document.getElementById('result-tbody');
    tbody.innerHTML = '';
    let grandTotal = 0;

    if (currentViewData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">❌ ไม่พบข้อมูลวัสดุพัสดุสำหรับรหัสโครงข่ายนี้ในระบบไฟล์ดิบ</td></tr>`;
        document.getElementById('grand-total-val').innerText = '0.00';
        return;
    }

    currentViewData.forEach((item, index) => {
        // 🟢 ลอจิกทีเด็ด: ดึงน้ำหนักจาก Sheets ก่อน ถ้าไม่มีหรือเน็ตพัง ให้ดึงจากน้ำหนักไฟล์ .txt บน GitHub (window.weightData) ทันที!
        const localWeightInfo = window.weightData ? window.weightData[item.materialCode] : null;
        const weightInfo = cloudWeightsMap[item.materialCode] || localWeightInfo || { weight: 0.00, unit: 'กก.' };
        
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
        alert('เชื่อมต่อฐานข้อมูล Google Sheets ล้มเหลว (ค่าใหม่จะยังบันทึกเข้าคลาวด์ไม่ได้เนื่องจากติดสิทธิ์เครือข่าย)');
    }
}

async function loadWeightTable() {
    const tbody = document.getElementById('weight-list-tbody');
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">กำลังโหลดรายการน้ำหนักวัสดุจากระบบคลาวด์...</td></tr>`;
    
    // ดึงค่าเริ่มต้นจากใน GitHub มาโชว์เป็นฐานหลักก่อนเพื่อให้ตารางไม่ว่างเปล่า
    if (window.weightData) {
        tbody.innerHTML = '';
        for (const code in window.weightData) {
            const w = window.weightData[code];
            tbody.innerHTML += `
                <tr>
                    <td>${code}</td>
                    <td class="bold">${w.weight}</td>
                    <td>${w.unit}</td>
                    <td><button onclick="pullToEdit('${code}', ${w.weight}, '${w.unit}')" style="background:#e2e8f0; border:none; padding:4px 8px; font-size:12px; cursor:pointer; border-radius:4px;">ดึงค่า</button></td>
                </tr>
            `;
        }
    }
}

function pullToEdit(code, weight, unit) {
    document.getElementById('form-code').value = code;
    document.getElementById('form-weight').value = weight;
    document.getElementById('form-unit').value = unit;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
