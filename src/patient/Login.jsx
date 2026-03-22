import { useState } from "react";
  import { useNavigate } from "react-router-dom";


export default function Login() {
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const navigate = useNavigate();
const styles = {
  container: {
    backgroundColor: "#F5EEDD",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  card: {
    backgroundColor: "#7AE2CF",
    padding: "40px",
    borderRadius: "12px",
    width: "350px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
  },
  title: {
    textAlign: "center",
    marginBottom: "20px",
    color: "#06202B"
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "none",
    outline: "none"
  },
  button: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#077A7D",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer"
  }
};
 const handleLogin = async () => {
  try {

    const response = await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });

    const data = await response.json();

    if (response.ok) {

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);

      if (data.role === "PATIENT") {
        navigate("/patient_dashboard");
      }

      if (data.role === "DOCTOR") {
        navigate("/doctor-dashboard");
      }

    } 
    else {

      // EMAIL NOT FOUND → GO TO REGISTER
      if (data.message === "User not found") {

        alert("Email not registered. Please register.");

        navigate("/register");

      } else {
        alert(data.message);
      }

    }

  } catch (error) {
    console.error(error);
    alert("Login Failed");
  }
};

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Pregnancy Support Login</h2>

        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
        />

        <button style={styles.button} onClick={handleLogin}>
          Login
        </button>
      </div>
    </div>
  );
}