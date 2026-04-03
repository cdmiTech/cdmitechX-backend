const Report = require('../models/Report');
const Student = require('../models/Student');
const nodemailer = require('nodemailer');
const axios = require('axios');

// Helper to send email
const sendReportEmail = async (student, report, languageName, topicNames, googleAccessToken, projectWorkTitles = []) => {
    console.log("topicNames ==> ", topicNames);
    console.log("projectWorkTitles ==> ", projectWorkTitles);

    // Check if we have an OAuth token (from student) or system credentials
    const useOAuth = !!googleAccessToken;
    const useSystem = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

    if (!useOAuth && !useSystem) {
        console.warn('⚠️ No email configuration found (Missing .env credentials and no Student OAuth token). Email not sent.');
        return false;
    }

    try {
        const formattedDate = report.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        const projectWorkText = Array.isArray(projectWorkTitles) && projectWorkTitles.length > 0 ? `\nProject Work Title(s): ${projectWorkTitles.join(', ')}` : '';

        const mailOptions = {
            from: useOAuth ? `"${student.name}" <${student.email}>` : `"${student.name}" <${process.env.EMAIL_USER}>`,
            to: 'cdmi.project@gmail.com',
            subject: `Today's Report - ${formattedDate}`,
            text: `Today's Report - ${formattedDate}\n\nStudent: ${student.name}\nBatch: ${student.batchTime}\nLanguage: ${languageName}\nTopics: ${topicNames}${projectWorkText}\n\nDescription:\n${report.description}`,
            html: `
                <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 20px; border-radius: 20px;">
                    <div style="background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">DAILY REPORT</h1>
                            <p style="color: #64748b; margin-top: 8px; font-weight: 500;">Submitted on ${formattedDate}</p>
                        </div>
                        
                        <div style="border-top: 2px solid #f1f5f9; padding-top: 30px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 600; width: 35%;">Student Name</td>
                                    <td style="padding: 12px 0; color: #1e293b; font-size: 14px; font-weight: 700;">${student.name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 600;">Batch Time</td>
                                    <td style="padding: 12px 0; color: #1e293b; font-size: 14px; font-weight: 700;">${student.batchTime || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 600;">Language</td>
                                    <td style="padding: 12px 0; color: #1e293b; font-size: 14px; font-weight: 700;">
                                        <span style="background-color: #eef2ff; color: #4f46e5; padding: 4px 10px; border-radius: 6px; font-size: 12px;">${languageName}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 600;">Topic</td>
                                    <td style="padding: 12px 0; color: #1e293b; font-size: 14px; font-weight: 700;">${topicNames}</td>
                                </tr>
                                ${projectWorkTitles && projectWorkTitles.length > 0 ? `
                                <tr>
                                    <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 600;">Project Work Title(s)</td>
                                    <td style="padding: 12px 0; color: #1e293b; font-size: 14px; font-weight: 700;">${projectWorkTitles.join(', ')}</td>
                                </tr>
                                ` : ''}
                            </table>
                        </div>

                        <div style="margin-top: 30px; padding: 25px; background-color: #f1f5f9; border-radius: 12px; border: 1px dashed #cbd5e1;">
                            <h3 style="color: #334155; margin: 0 0 12px 0; font-size: 15px; font-weight: 700;">Description</h3>
                            <p style="color: #475569; margin: 0; line-height: 1.6; white-space: pre-wrap; font-size: 14px;">${report.description}</p>
                        </div>
                        
                        </div>
                    </div>
                </div>
            `
        };

        if (useOAuth) {
            // Using Gmail API (More reliable for the gmail.send scope than SMTP)
            const transporter = nodemailer.createTransport({ streamTransport: true, newline: 'unix', buffer: true });
            const info = await transporter.sendMail(mailOptions);
            const rawMessage = info.message.toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            await axios.post(
                'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
                { raw: rawMessage },
                {
                    headers: {
                        'Authorization': `Bearer ${googleAccessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log(`✅ Email sent successfully via GMAIL API to cdmi.project@gmail.com`);
        } else {
            // Standard SMTP Fallback
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
            await transporter.sendMail(mailOptions);
            console.log(`✅ Email sent successfully via System SMTP to cdmi.project@gmail.com`);
        }
        return true;
    } catch (error) {
        // Detailed logging to a file for debugging
        const fs = require('fs');
        const logMsg = `\n[${new Date().toISOString()}] ERROR: ${error.response?.data?.error?.message || error.message}\n` +
            `TYPE: ${googleAccessToken ? 'GMAIL API' : 'System SMTP'}\n` +
            `STATUS: ${error.response?.status || 'N/A'}\n` +
            `------------------------------------------\n`;
        fs.appendFileSync('email_debug.log', logMsg);

        console.error('❌ Error sending email:', error.response?.data?.error?.message || error.message);
        return false;
    }
};

// @desc    Submit report
// @route   POST /api/reports
// @access  Private (Student)
exports.submitReport = async (req, res) => {
    try {
        const { date, languageId, topicIds, description, languageName, topicNames, googleAccessToken, projectWorkTitles } = req.body;

        // Find the Student document corresponding to the logged-in User
        const student = await Student.findOne({ email: req.user.email });
        if (!student) {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        const studentId = student._id;

        // Check if report already exists for this date
        const incomingDate = new Date(date);
        const existingReport = await Report.findOne({ studentId, date: incomingDate });
        if (existingReport) {
            return res.status(400).json({ message: 'Report already submitted for this date' });
        }

        const reportData = {
            studentId,
            facultyId: student.facultyId,
            date: incomingDate,
            languageId,
            topicIds: Array.isArray(topicIds) ? topicIds : [topicIds],
            projectWorkTitles: Array.isArray(projectWorkTitles) ? projectWorkTitles : (projectWorkTitles ? [projectWorkTitles] : []),
            description
        };

        // 1. Try to send email (Step 1)
        const emailSent = await sendReportEmail(
            student,
            reportData,
            languageName,
            topicNames || '',
            googleAccessToken,
            reportData.projectWorkTitles
        );

        // 2. IF email fails: Do NOT save report (Step 2 - ELSE)
        if (!emailSent) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send report email. Please try again.'
            });
        }

        // 3. IF email is successfully sent: Save report in database (Step 2)
        const report = await Report.create(reportData);

        res.status(201).json({
            success: true,
            data: report,
            message: 'Report Submitted Successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get reports for logged in student
// @route   GET /api/reports/student
// @access  Private (Student)
exports.getStudentReports = async (req, res) => {
    try {
        const student = await Student.findOne({ email: req.user.email });
        if (!student) {
            return res.status(200).json({ success: true, count: 0, data: [] });
        }

        const reports = await Report.find({ studentId: student._id })
            .populate('languageId', 'name')
            .populate('topicIds', 'name order');
        res.status(200).json({ success: true, count: reports.length, data: reports });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get reports for faculty view
// @route   GET /api/reports/faculty
// @access  Private (Faculty/Admin)
exports.getFacultyReports = async (req, res) => {
    try {
        const { date, studentName, facultyId, studentId } = req.query;
        let query = {};

        if (studentId) {
            query.studentId = studentId;
        }

        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            query.date = { $gte: startDate, $lte: endDate };
        }

        if (facultyId) {
            query.facultyId = facultyId;
        } else if (req.user.role === 'faculty') {
            query.facultyId = req.user.id;
        }

        // Get submitted reports
        let reports = await Report.find(query)
            .populate('studentId', 'name batchTime')
            .populate('languageId', 'name')
            .populate('topicIds', 'name order');

        // Filter by student name if provided
        if (studentName) {
            reports = reports.filter(r => r.studentId && r.studentId.name.toLowerCase().includes(studentName.toLowerCase()));
        }

        // Identify non-submitted students for the given date
        let nonSubmitted = [];
        if (date) {
            let studentQuery = {};
            if (facultyId) {
                studentQuery.facultyId = facultyId;
            } else if (req.user.role === 'faculty') {
                studentQuery.facultyId = req.user.id;
            }

            const allStudents = await Student.find(studentQuery).select('name batchTime');
            const submittedStudentIds = reports.map(r => r.studentId._id.toString());

            nonSubmitted = allStudents.filter(s => !submittedStudentIds.includes(s._id.toString()));

            if (studentName) {
                nonSubmitted = nonSubmitted.filter(s => s.name.toLowerCase().includes(studentName.toLowerCase()));
            }
        }

        res.status(200).json({
            success: true,
            submitted: reports,
            notSubmitted: nonSubmitted
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
