import "./Preodic.css";
import React, { useState, useEffect } from "react";
import supabase from "../../database/supabase"; // Hoặc import từ shared
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Import các thành phần dùng chung (FSD)
import { Sidebar } from "../../shared/ui"; 
import { useAuth } from "../../shared/hooks";

function Preodic() {
  // Sử dụng hook useAuth để lấy userId an toàn và reactive
  const { userId } = useAuth();

  // State
  const [balance, setBalance] = useState(0); // Đã sửa lỗi cú pháp useState
  const [walletId, setWalletId] = useState(0);
  const [periodicData, setPeriodicData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  const [newPeriodic, setNewPeriodic] = useState({
    name_preodic: "",
    amount: "",
    frequency: "Hàng tháng",
    startDate: "",
    endDate: "",
    is_active: true,
  });

  const [editPeriodic, setEditPeriodic] = useState({
    id: null,
    name: "",
    amount: "",
    frequency: "Hàng tháng",
    startDate: "",
    endDate: "",
    status: "Hoạt động",
  });

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!userId) return;

    const fetchWallet = async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("wallet_id, balance")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error fetching wallet:", error);
      } else {
        setBalance(data.balance);
        setWalletId(data.wallet_id);
      }
    };

    const fetchPeriodicData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("preodic")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const formattedData = data.map((item) => ({
          id: item.id,
          name: item.name_preodic,
          amount: item.amount,
          frequency: item.frequency,
          startDate: item.startDate,
          endDate: item.endDate,
          status: item.is_active ? "Hoạt động" : "Tạm dừng",
          next_execution: item.next_execution,
        }));

        setPeriodicData(formattedData);
      } catch (err) {
        setError(err.message);
        toast.error("Lỗi tải dữ liệu: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWallet();
    fetchPeriodicData();
  }, [userId]);

  // --- NOTIFICATION LOGIC ---
  useEffect(() => {
    periodicData.forEach((item) => {
      if (item.status === "Hoạt động" && item.next_execution) {
        const nextExec = new Date(item.next_execution);
        const today = new Date();
        if (
          nextExec.getDate() === today.getDate() &&
          nextExec.getMonth() === today.getMonth() &&
          nextExec.getFullYear() === today.getFullYear()
        ) {
          toast.info(
            `Định kỳ "${item.name}" đến hạn hôm nay (${item.amount.toLocaleString()} đ)!`,
            { position: "top-right", autoClose: 5000 }
          );
        }
      }
    });
  }, [periodicData]);

  // --- HANDLERS ---

  const calculateNextExecution = (startDate, frequency) => {
    const date = new Date(startDate);
    if (isNaN(date.getTime())) return new Date().toISOString();

    switch (frequency) {
      case "3 phút": date.setMinutes(date.getMinutes() + 3); break;
      case "Hàng ngày": date.setDate(date.getDate() + 1); break;
      case "Hàng tuần": date.setDate(date.getDate() + 7); break;
      case "Hàng tháng": date.setMonth(date.getMonth() + 1); break;
      case "Hàng quý": date.setMonth(date.getMonth() + 3); break;
      case "Hàng năm": date.setFullYear(date.getFullYear() + 1); break;
      default: break;
    }
    return date.toISOString();
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewPeriodic((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!walletId) {
      toast.error("Không tìm thấy ví tiền!");
      return;
    }

    try {
      const startDateObj = newPeriodic.frequency === "3 phút" ? new Date() : new Date(newPeriodic.startDate);
      const nextExecution = calculateNextExecution(startDateObj, newPeriodic.frequency);
      
      const payload = {
        ...newPeriodic,
        user_id: userId,
        wallet_id: walletId,
        amount: Number(newPeriodic.amount),
        startDate: new Date(newPeriodic.startDate).toISOString().split("T")[0],
        endDate: new Date(newPeriodic.endDate).toISOString().split("T")[0],
        created_at: new Date().toISOString(),
        next_execution: nextExecution,
      };

      const { data, error } = await supabase.from("preodic").insert([payload]).select();

      if (error) throw error;

      const inserted = data[0];
      setPeriodicData((prev) => [
        {
          ...inserted,
          name: inserted.name_preodic,
          status: newPeriodic.is_active ? "Hoạt động" : "Tạm dừng",
          amount: Number(newPeriodic.amount),
          startDate: inserted.startDate, // Hiển thị nguyên bản hoặc format lại nếu cần
          endDate: inserted.endDate,
        },
        ...prev,
      ]);

      setShowForm(false);
      setNewPeriodic({
        name_preodic: "",
        amount: "",
        frequency: "Hàng tháng",
        startDate: "",
        endDate: "",
        is_active: true,
      });
      toast.success("Thêm định kỳ thành công!");
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra khi thêm định kỳ!");
    }
  };

  const handleEdit = (item) => {
    setEditPeriodic({
      id: item.id,
      name: item.name,
      amount: item.amount,
      frequency: item.frequency,
      // Chuyển format ngày để hiển thị đúng trong input type="date"
      startDate: item.startDate, 
      endDate: item.endDate,
      status: item.status,
    });
    setShowEditForm(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditPeriodic((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("preodic")
        .update({
          name_preodic: editPeriodic.name,
          amount: Number(editPeriodic.amount),
          frequency: editPeriodic.frequency,
          startDate: editPeriodic.startDate,
          endDate: editPeriodic.endDate,
          is_active: editPeriodic.status === "Hoạt động",
        })
        .eq("id", editPeriodic.id);

      if (error) throw error;

      setPeriodicData((prev) =>
        prev.map((item) =>
          item.id === editPeriodic.id
            ? {
                ...item,
                name: editPeriodic.name,
                amount: Number(editPeriodic.amount),
                frequency: editPeriodic.frequency,
                startDate: editPeriodic.startDate,
                endDate: editPeriodic.endDate,
                status: editPeriodic.status,
              }
            : item
        )
      );
      setShowEditForm(false);
      toast.success("Cập nhật thành công!");
    } catch (err) {
      toast.error("Lỗi cập nhật!");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc muốn xóa định kỳ này không?")) {
      try {
        const { error } = await supabase.from("preodic").delete().eq("id", id);
        if (error) throw error;
        setPeriodicData((prev) => prev.filter((item) => item.id !== id));
        toast.success("Đã xóa thành công!");
      } catch (err) {
        toast.error("Lỗi khi xóa!");
      }
    }
  };

  const getDaysLeft = (endDateStr) => {
     // Handle DD/MM/YYYY or YYYY-MM-DD
     let end;
     if (endDateStr.includes("/")) {
        const [day, month, year] = endDateStr.split("/").map(Number);
        end = new Date(year, month - 1, day);
     } else {
        end = new Date(endDateStr);
     }
     
     const today = new Date();
     end.setHours(0, 0, 0, 0);
     today.setHours(0, 0, 0, 0);
     const diffTime = end - today;
     return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredData = periodicData.filter((item) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "active") return item.status === "Hoạt động";
    if (filterStatus === "inactive") return item.status === "Tạm dừng";
    return true;
  });

  return (
    <div className="bodyPre">
      {/* Sử dụng Sidebar Component chung */}
      <Sidebar currentPath="/preodic" />

      <div className="periodic-table-container">
        <div className="table-header">
          <h2>Danh sách định kỳ</h2>
          <div className="filter-container">
            <label htmlFor="statusFilter" className="filter-label">
              Trạng thái:
            </label>
            <select
              id="statusFilter"
              className="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Tạm dừng</option>
            </select>
          </div>
          <button className="btnpre add-btn" onClick={() => setShowForm(true)}>
            + Thêm định kỳ
          </button>
        </div>

        {/* Form Thêm Mới */}
        {showForm && (
            <div className="overlay" onClick={() => setShowForm(false)}>
              <div className="form-container" onClick={(e) => e.stopPropagation()}>
                <h2>Thêm định kỳ mới</h2>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Tên định kỳ <span>*</span></label>
                    <input type="text" name="name_preodic" value={newPeriodic.name_preodic} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Số tiền <span>*</span></label>
                    <input type="number" name="amount" value={newPeriodic.amount} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Tần suất <span>*</span></label>
                    <select name="frequency" value={newPeriodic.frequency} onChange={handleInputChange} required>
                      <option value="3 phút">3 phút</option>
                      <option value="Hàng ngày">Hàng ngày</option>
                      <option value="Hàng tuần">Hàng tuần</option>
                      <option value="Hàng tháng">Hàng tháng</option>
                      <option value="Hàng quý">Hàng quý</option>
                      <option value="Hàng năm">Hàng năm</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Ngày bắt đầu <span>*</span></label>
                      <input type="date" name="startDate" value={newPeriodic.startDate} onChange={handleInputChange} required />
                    </div>
                    <div className="form-group">
                      <label>Ngày kết thúc <span>*</span></label>
                      <input type="date" name="endDate" value={newPeriodic.endDate} onChange={handleInputChange} required />
                    </div>
                  </div>
                  <div className="form-group checkbox">
                    <label>
                      <input type="checkbox" name="is_active" checked={newPeriodic.is_active} onChange={handleInputChange} />
                      Kích hoạt ngay
                    </label>
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={() => setShowForm(false)}>Hủy</button>
                    <button type="submit">Lưu</button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {/* Form Chỉnh Sửa */}
        {showEditForm && (
            <div className="overlay2" onClick={() => setShowEditForm(false)}>
            <div className="form-container" onClick={(e) => e.stopPropagation()}>
                <h2>Chỉnh sửa định kỳ</h2>
                <form onSubmit={handleEditSubmit}>
                <div className="form-group">
                    <label>Tên định kỳ</label>
                    <input type="text" name="name" value={editPeriodic.name} onChange={handleEditInputChange} required />
                </div>
                <div className="form-group">
                    <label>Số tiền</label>
                    <input type="number" name="amount" value={editPeriodic.amount} onChange={handleEditInputChange} required />
                </div>
                <div className="form-group">
                    <label>Tần suất</label>
                    <select name="frequency" value={editPeriodic.frequency} onChange={handleEditInputChange} required>
                    <option value="Hàng ngày">Hàng ngày</option>
                    <option value="Hàng tuần">Hàng tuần</option>
                    <option value="Hàng tháng">Hàng tháng</option>
                    <option value="Hàng quý">Hàng quý</option>
                    <option value="Hàng năm">Hàng năm</option>
                    </select>
                </div>
                <div className="form-row">
                    <div className="form-group">
                    <label>Ngày bắt đầu</label>
                    <input type="date" name="startDate" value={editPeriodic.startDate} onChange={handleEditInputChange} required />
                    </div>
                    <div className="form-group">
                    <label>Ngày kết thúc</label>
                    <input type="date" name="endDate" value={editPeriodic.endDate} onChange={handleEditInputChange} required />
                    </div>
                </div>
                <div className="form-group">
                    <label>Trạng thái</label>
                    <select name="status" value={editPeriodic.status} onChange={handleEditInputChange}>
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Tạm dừng">Tạm dừng</option>
                    </select>
                </div>
                <div className="form-actions">
                    <button type="button" onClick={() => setShowEditForm(false)}>Hủy</button>
                    <button type="submit">Lưu thay đổi</button>
                </div>
                </form>
            </div>
            </div>
        )}

        <table className="periodic-table">
          <thead>
            <tr>
              <th>Tên định kỳ</th>
              <th>Số tiền</th>
              <th>Tần suất</th>
              <th>Ngày bắt đầu</th>
              <th>Ngày kết thúc</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7">Đang tải...</td></tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.amount.toLocaleString()} đ</td>
                  <td>{item.frequency}</td>
                  <td>{item.startDate}</td>
                  <td>{item.endDate}</td>
                  <td data-status={item.status}>{item.status}</td>
                  <td>
                    <button className="btnpre edit-btn" onClick={() => handleEdit(item)}>Sửa</button>
                    <button className="btnpre delete-btn" onClick={() => handleDelete(item.id)}>Xóa</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Phần nhắc nhở */}
      <div className="periodic-notice">
        <h2>Nhắc nhở</h2>
        {periodicData
          .filter(item => item.status === "Hoạt động" && getDaysLeft(item.endDate) <= 3 && getDaysLeft(item.endDate) >= 0)
          .map((item) => (
            <div key={item.id} className="reminder-item">
              <strong>{item.name}</strong> sẽ kết thúc trong <span className="days-left">{getDaysLeft(item.endDate)} ngày</span> nữa.
            </div>
        ))}
        {periodicData.filter(item => item.status === "Hoạt động" && getDaysLeft(item.endDate) <= 3 && getDaysLeft(item.endDate) >= 0).length === 0 && (
          <div className="notice-empty">Không có định kỳ nào sắp hết hạn.</div>
        )}
      </div>

      {/* Đặt ToastContainer ở đây, TRONG component */}
      <ToastContainer />
    </div>
  );
}

export default Preodic;