import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./patient/Login";
import PregnancyRegister from "./patient/PregnancyRegister";
import PatientDashboard from "./patient/PatientDashboard";

import DoctorDashboardLayout from "./doctor/DoctorDashboardLayout";

function App() {

return(

<BrowserRouter>

<Routes>

<Route path="/" element={<Login/>}/>

<Route path="/register" element={<PregnancyRegister/>}/>

<Route path="/patient_dashboard/*" element={<PatientDashboard/>}/>

<Route path="/doctor-dashboard/*" element={<DoctorDashboardLayout/>}/>

</Routes>

</BrowserRouter>

);

}

export default App;