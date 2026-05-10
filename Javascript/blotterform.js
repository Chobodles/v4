// ============================================================
//  Barangay Tugtug E-System — Blotter Form Submission JS
//  File: Javascript/blotterform.js
//  Used by: blotterdemo.html
// ============================================================

function validateAndSubmit() {
    const form = document.getElementById("blotterForm");

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const btn = document.querySelector(".submit-btn");
    btn.textContent = "Submitting…";
    btn.disabled    = true;

    // ── Build payload matching submit_blotter.php's expected fields ──
    // submit_blotter.php expects: first_name, middle_name, last_name, suffix
    // (NOT a combined full_name field)
    const data = {
        first_name:        form.querySelector('[name="first_name"]')
                               ? form.querySelector('[name="first_name"]').value.trim()
                               : (form.querySelector('[name="name"]')?.value.trim() || ""),
        middle_name:       form.querySelector('[name="middle_name"]')
                               ? form.querySelector('[name="middle_name"]').value.trim()
                               : "",
        last_name:         form.querySelector('[name="last_name"]')
                               ? form.querySelector('[name="last_name"]').value.trim()
                               : "",
        suffix:            form.querySelector('[name="suffix"]')
                               ? form.querySelector('[name="suffix"]').value.trim()
                               : "",
        age:               form.querySelector('[name="age"]').value,
        civil_status:      form.querySelector('[name="status"]').value.trim(),
        address:           form.querySelector('[name="address"]').value.trim(),
        occupation:        form.querySelector('[name="occupation"]').value.trim(),
        // PHP maps petsa → b.petsa (date), oras → b.oras (time)
        petsa:             form.querySelector('[name="incident_date"]').value,
        oras:              form.querySelector('[name="incident_time"]').value,
        complaint_against: form.querySelector('[name="complainant_name"]').value.trim(),
        complaint_type:    form.querySelector('[name="complaint_type"]')
                               ? form.querySelector('[name="complaint_type"]').value.trim()
                               : "",
        complaint_details: form.querySelector('[name="complaint_details"]').value.trim(),
    };

    fetch("php/submit_blotter.php", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            // Store reference number for the thank-you page
            // result.reference_number is the BRGY-YEAR-XXXXX string
            sessionStorage.setItem("blotter_ref", result.reference_number);
            window.location.href = "blotterthankyou.html";
        } else {
            alert("Error: " + (result.message || "Submission failed."));
            btn.textContent = "Submit Blotter Report";
            btn.disabled    = false;
        }
    })
    .catch(() => {
        alert("Server error. Please try again.");
        btn.textContent = "Submit Blotter Report";
        btn.disabled    = false;
    });
}