// js/app.js
const API_URL = "https://script.google.com/macros/s/AKfycbxF6cy4_Xd2I30ePPqQFF3qeYPn77CldMsewIzePotdsXsEvwdzX1QdWXPeiucfaVNU9Q/exec";
let currentData = [];

async function fetchNetworkData() {
    const networkId = document.getElementById('network-input').value.trim();
    if (!networkId) return alert('กรุณาระบุรหัสโครงข่ายก่อนค้นหา');
    
    // แสดงสถานะระหว่างโหลดข้อมูล
    const tbody = document.getElementById('materials-tbody');
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">⏳ กำลังดึงข้อมูลและคำนวณน้ำหนักจากฐานข้อมูลคลาวด์...</td></tr>`;
    document.getElementById('result-card').classList.remove('hidden');
    
    try {
        const response = await fetch(`${API_URL}?action=get_network_data&networkId=${networkId}`);
        const res = await response.json();
        if (res.status === 'success') {
            currentData = res.data;
            renderTable();
        } else {
            alert('Error: ' + res.message);
        }
    } catch (err) { 
        alert('ไม่สามารถเชื่อมต่อ API หลังบ้านได้ กรุณาตรวจสอบสถานะอินเทอร์เน็ต'); 
    }
}

function renderTable() {
    const tbody = document.getElementById('materials-tbody');
    tbody.innerHTML = '';
    let grandTotal = 0;

    if (!currentData || currentData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">❌ ไม่พบข้อมูลวัสดุสำหรับโครงข่ายนี้ในระบบ</td></tr>`;
        document.getElementById('grand-total-weight').innerText = '0.00';
        return;
    }

    currentData.forEach((item, index) => {
        const diffQty = parseFloat(item.diffQty) || 0;
        const unitWeight = parseFloat(item.unitWeight) || 0;
        const totalWeight = diffQty * unitWeight;
        grandTotal += totalWeight;

        tbody.innerHTML += `
            <tr>
                <td>${item.wbs}</td>
                <td style="font-weight:bold;">${item.materialCode}</td>
                <td>${item.description}</td>
                <td style="text-align:right;">${diffQty.toLocaleString()}</td>
                <td style="text-align:right;">${unitWeight.toFixed(3)}</td>
                <td>${item.unit || 'กก.'}</td>
                <td style="text-align:right; font-weight:bold;">${totalWeight.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td class="action-col" style="text-align:center;">
                    <button onclick="removeItem(${index})" style="background:#dc2626; color:white; padding:4px 10px; border:none; border-radius:4px; cursor:pointer;">ลบ</button>
                </td>
            </tr>
        `;
    });
    
    document.getElementById('grand-total-weight').innerText = grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function removeItem(index) {
    if(confirm('คุณต้องการลบรายการนี้ออกจากการพิมพ์รายงานปัจจุบันใช่หรือไม่?')) {
        currentData.splice(index, 1);
        renderTable();
    }
}
