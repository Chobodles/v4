<!DOCTYPE html>
<?php require "include/conn.php"; ?>

<html lang="en">
<head>
    <title>Document Request | Barangay Tugtug E-System</title>
    <link rel="stylesheet" href="cssfile/residentform.css">
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <link rel="icon" href="photos/logo.png.png"/>
</head>

<body>
    <button class="btn-back" onclick="history.back()">
        <img class="backbutton" src="photos/backbutton.png" alt="Back">
        <label class="back">Back</label>
    </button>

    <div class="form-container">
        <div class="form-header">
            <div class="header-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>
            <div class="header-text">
                <h2>Personal Information</h2>
                <p>Please provide your details accurately as they will appear on the document</p>
            </div>
        </div>

        <form class="personal-info-form" id="personal-info-form" action="php/submit_document.php" method="POST" enctype="multipart/form-data">

            <div class="row">
                <div class="form-group">
                    <label>FIRST NAME <span class="required">*</span></label>
                    <input type="text" name="first_name" placeholder="e.g. Juan" pattern="[A-Za-z\s.]+" title="Letters only" required>
                </div>
                <div class="form-group">
                    <label>LAST NAME <span class="required">*</span></label>
                    <input type="text" name="last_name" placeholder="e.g. Dela Cruz" pattern="[A-Za-z\s.]+" title="Letters only" required>
                </div>
            </div>

            <div class="row">
                <div class="form-group">
                    <label>MIDDLE NAME</label>
                    <input type="text" name="middle_name" placeholder="e.g. Santos" pattern="[A-Za-z\s.]+">
                </div>
                <div class="form-group">
                    <label>SUFFIX</label>
                    <select name="suffix">
                        <option value="">— None —</option>
                        <option value="Jr.">Jr.</option>
                        <option value="Sr.">Sr.</option>
                        <option value="II">II</option>
                        <option value="III">III</option>
                        <option value="IV">IV</option>
                    </select>
                </div>
            </div>

            <div class="row">
                <div class="form-group">
                    <label>BIRTHDAY <span class="required">*</span></label>
                    <input type="date" name="birthday" id="birthday" required>
                </div>
                <div class="form-group">
                    <label>AGE <span class="required">*</span></label>
                    <input type="number" name="age" id="age" min="0" placeholder="0" readonly tabindex="-1" style="background-color: #f0f0f0; cursor: not-allowed;" required>
                </div>
            </div>

            <div class="row">
                <div class="form-group">
                    <label>GENDER <span class="required">*</span></label>
                    <select name="gender" required>
                        <option value="">— Select —</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>CIVIL STATUS <span class="required">*</span></label>
                    <select name="civil_status" required>
                        <option value="">— Select —</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Widowed">Widowed</option>
                        <option value="Separated">Separated</option>
                    </select>
                </div>
            </div>

            <div class="row">
                <div class="form-group">
                    <label>CONTACT NUMBER <span class="required">*</span></label>
                    <input type="text" name="contact" placeholder="09XX XXX XXXX" required pattern="^(09|\+639)\d{9}$">
                </div>
                <div class="form-group">
                    <label>BIRTHPLACE <span class="required">*</span></label>
                    <input type="text" name="birthplace" placeholder="City/Province" required>
                </div>
            </div>

            <div class="row">
                <div class="form-group">
                    <label>LENGTH OF STAY (YEARS) <span class="required">*</span></label>
                    <input type="number" name="stay_years" min="0" required>
                </div>
                <div class="form-group">
                    <label>LENGTH OF STAY (MONTHS)</label>
                    <input type="number" name="stay_months" min="0" max="11" placeholder="0">
                </div>
            </div>

            <div class="row-certificate">
                <div class="form-group">
                    <label>KIND OF CERTIFICATE <span class="required">*</span></label>
                    <select name="txtdocumenttype" id="documenttype" required>
                        <option value="">Select Document</option>
                        <?php
                        $sql1 = "SELECT * FROM documents order by document_ID";
                        $result1 = $conn->query($sql1);
                        if ($result1 && $result1->num_rows > 0) {
                            while ($row1 = $result1->fetch_assoc()) {
                                echo '<option value="' .
                                    $row1["document_ID"] .
                                    '">' .
                                    $row1["document_type"] .
                                    "</option>";
                            }
                        }
                        ?>
                    </select>
                </div>
                <div class="form-group">
                    <label>QUANTITY <span class="required">*</span></label>
                    <input id="quantity-form" type="number" name="quantity" min="1" value="1" required>
                </div>
            </div>

            <div class="form-group full-width">
                <label>PURPOSE <span class="required">*</span></label>
                <input type="text" name="purpose" placeholder="e.g., Job Requirement" required>
            </div>

            <div class="form-group full-width">
                <label>UPLOAD VALID ID <span class="required">*</span></label>
                <div class="file-input-wrapper" style="display: flex; gap: 10px; align-items: center;">
                    <input type="file" name="id_image" id="id_image" accept="image/*" required style="flex-grow: 1;">
                    <button type="button" id="clear-file" class="btn-clear" style="display: none;">Clear</button>
                </div>
                <p class="field-hint">Upload a clear photo for verification.</p>
            </div>

            <div class="privacy-note" style="margin: 20px 0; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px;">
                <div style="display: flex; align-items: flex-start; gap: 10px;">
                    <input type="checkbox" id="privacy_agree" name="privacy_agree" required>
                    <label for="privacy_agree" style="font-size: 0.85rem; color: #333; cursor: pointer;">
                        <strong>Data Privacy Notice:</strong> I hereby authorize Barangay Tugtug to collect and process my personal information for document request purposes in accordance with the Data Privacy Act of 2012.
                    </label>
                </div>
            </div>

            <button class="btn-submit" type="submit">Submit Request</button>
        </form>
    </div>

    <script>
        window.onload = function() {
          const bdayInput = document.getElementById('birthday');
              const ageInput = document.getElementById('age');

              bdayInput.onchange = function() {
                  if (this.value) {
                      const birthDate = new Date(this.value);
                      const today = new Date();

                      let age = today.getFullYear() - birthDate.getFullYear();
                      const monthDiff = today.getMonth() - birthDate.getMonth();

                      // Adjust age if birthday hasn't occurred yet this year
                      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                          age--;
                      }

                      // Update the readonly field
                      ageInput.value = age >= 0 ? age : 0;
                  }
              };

            // 3. Image Upload & Clear Logic
            const fileInput = document.getElementById('id_image');
            const clearBtn = document.getElementById('clear-file');

            fileInput.onchange = function() {
                if (this.files && this.files.length > 0) {
                    clearBtn.style.display = 'inline-block';
                } else {
                    clearBtn.style.display = 'none';
                }
            };

            clearBtn.onclick = function() {
                fileInput.value = ""; // Clears the file
                this.style.display = 'none'; // Hides the button
            };

            // 4. Catch error parameters from URL (Redirect handling)
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('error') === 'name_numbers') {
                alert("Names cannot contain numbers.");
            } else if (urlParams.get('error') === 'upload_fail') {
                alert("ID Upload failed. Please try again.");
            } else if (urlParams.get('error') === 'db_fail') {
                alert("Database error. Please contact the administrator.");
            }

            // Clear URL parameters after showing alert
            if (urlParams.has('error')) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        };
    </script>
</body>
</html>
