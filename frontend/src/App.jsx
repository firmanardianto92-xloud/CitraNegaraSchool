import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import MateriTugas from "@/pages/MateriTugas";
import Ppdb from "@/pages/Ppdb";
import Pembayaran from "@/pages/Pembayaran";
import Kwitansi from "@/pages/Kwitansi";
import Rapor from "@/pages/Rapor";
import KelasSaya from "@/pages/KelasSaya";
import Mentoring from "@/pages/Mentoring";
import Assistant from "@/pages/Assistant";
import Admin from "@/pages/Admin";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/materi-tugas" element={<MateriTugas />} />
        <Route path="/ppdb" element={<Ppdb />} />
        <Route path="/pembayaran" element={<Pembayaran />} />
        <Route path="/kwitansi/:invoiceId" element={<Kwitansi />} />
        <Route path="/rapor" element={<Rapor />} />
        <Route path="/kelas-saya" element={<KelasSaya />} />
        <Route path="/mentoring" element={<Mentoring />} />
        <Route path="/ai-assistant" element={<Assistant />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />
      </Routes>
      <Toaster position="bottom-right" richColors />
    </>
  );
}
