// js/app.js
let currentViewData = [];

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
}

// ฟังก์ชันค้นหาข้อมูลแบบออฟไลน์ความเร็วสูงจากโครงสร้างรันไฟล์คู่ของพี่
function searchNetworkData() {
    const targetNetId = document.getElementById('network-input').value.trim();
    if (!targetNetId) return alert('กรุณาระบุรหัสโครงข่ายก่อนค้นหา');

    const tbody = document.getElementById('result-tbody');
    
    // ตรวจจับไฟล์โมดูลข้อมูลหลักจากฝั่ง Python
    if (typeof window.sapData === 'undefined' || typeof window.weightData === 'undefined') {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:red; padding:20px;">❌ ไม่พบฐานข้อมูลในไฟล์ js/data.js กรุณาเช็กการรันบอทใน GitHub</td></tr>`;
        document.getElementById('result-card').classList.remove('hidden');
        return;
    }

    // กรองรหัสโครงข่ายตรงตัวในมิลลิวินาที
    currentViewData = window.sapData.filter(item => String(item.network).trim() === targetNetId);
    renderResultTable();
}

// ประมวลผลและกระจายข้อมูลลงสู่ตารางฟอร์มคำนวณและกล่องการ์ดเปอร์เซ็นต์
function renderResultTable() {
    const tbody = document.getElementById('result-tbody');
    tbody.innerHTML = '';
    let grandTotal = 0;

    if (currentViewData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:red; padding:20px;">❌ ไม่พบรายการข้อมูลพัสดุสำหรับรหัสโครงข่ายนี้ในระบบไฟล์ดิบ</td></tr>`;
        updateMetrics(0);
        return;
    }

    currentViewData.forEach((item, index) => {
        // ดึงค่าน้ำหนักพัสดุและหน่วยนับมาแมปด้วยรหัสวัสดุตรงจากหน้าคลัง .txt ใน GitHub
        const weightInfo = window.weightData[item.materialCode] || { weight: 0.00, unit: 'ชุด' };
        const totalRowWeight = item.diffQty * weightInfo.weight;
        grandTotal += totalRowWeight;

        tbody.innerHTML += `
            <tr>
                <td style="text-align:center;">${index + 1}</td>
                <td style="color:#555;">${item.wbs}</td>
                <td style="font-weight:600; color:#111;">${item.materialCode}</td>
                <td style="color:#000; font-weight:500;">${item.description}</td>
                <td class="num bold">${item.diffQty.toLocaleString()}</td>
                <td class="num" style="color:#666;">${weightInfo.weight.toFixed(3)}</td>
                <td style="text-align:center; color:#666;">${weightInfo.unit}</td>
                <td class="num bold" style="color:#0284c7;">${totalRowWeight.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td class="action-col" style="text-align:center;">
                    <button onclick="removeItem(${index})" style="background:#dc2626; color:white; padding:3px 8px; font-size:12px; border-radius:3px;">ลบออก</button>
                </td>
            </tr>
        `;
    });

    // อัปเดตค่าน้ำหนักสุทธิในแถวรวมท้ายตาราง
    document.getElementById('grand-total-val').innerText = grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    
    // 🟢 ส่งค่าน้ำหนักสุทธิไปคำนวณและอัปเดตลงกล่องการ์ดสรุป 100%, 90%, 80% ด้านบน
    updateMetrics(grandTotal);
    document.getElementById('result-card').classList.remove('hidden');
}

// คำนวณเปอร์เซ็นต์น้ำหนักเป้าหมายและสะท้อนผลขึ้นหน้าจอตื่นตาตื่นใจ
function updateMetrics(totalWeight) {
    const w100 = totalWeight;
    const w90 = totalWeight * 0.9;
    const w80 = totalWeight * 0.8;

    document.getElementById('weight-100').innerText = w100.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('weight-90').innerText = w90.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('weight-80').innerText = w80.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// ลบแถวพัสดุที่ไม่พึงประสงค์ออกชั่วคราวก่อนส่งพิมพ์ออกกระดาษรายงาน
function removeItem(idx) {
    if(confirm('คุณต้องการตัดพัสดุรายการนี้ออกจากรายงานการพิมพ์ปัจจุบันใช่หรือไม่?')) {
        currentViewData.splice(idx, 1);
        renderResultTable();
    }
}

// โหลดข้อมูลตารางพัสดุและน้ำหนักทั้งหมดมาแสดงในหน้าตารางข้อมูลเพื่อตรวจสอบสิทธิ์
function loadWeightTable() {
    const tbody = document.getElementById('weight-list-tbody');
    if (typeof window.weightData === 'undefined') {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">❌ ไม่พบข้อมูลพัสดุในไฟล์ระบบ</td></tr>`;
        return;
    }
    
    tbody.innerHTML = '';
    for (const code in window.weightData) {
        const w = window.weightData[code];
        tbody.innerHTML += `
            <tr>
                <td style="font-weight:600;">${code}</td>
                <td>${w.description}</td>
                <td class="num bold" style="color:#16a34a;">${w.weight.toFixed(3)}</td>
                <td style="text-align:center; color:#666;">${w.unit}</td>
            </tr>
        `;
    }
}
