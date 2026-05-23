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
            text: `Today's Report - ${formattedDate}\n\nStudent: ${student.name}\nBatch: ${student.batchTime}\nLanguage(s): ${languageName}\nTopics: ${topicNames}${projectWorkText}\n\nDescription:\n${report.description}`,
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
                                    <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 600;">Language(s)</td>
                                    <td style="padding: 12px 0; color: #1e293b; font-size: 14px; font-weight: 700;">
                                        ${languageName.split(',').map(name => `<span style="background-color: #eef2ff; color: #4f46e5; padding: 4px 10px; border-radius: 6px; font-size: 12px; margin-right: 5px;">${name.trim()}</span>`).join('')}
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
        const { date, languageId, languageIds, topicIds, description, languageName, topicNames, googleAccessToken, projectWorkTitles } = req.body;

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
            languageIds: Array.isArray(languageIds) ? languageIds : (languageId ? [languageId] : []),
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
            .populate('languageIds', 'name')
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
            const student = await Student.findById(studentId);
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }

            query.studentId = studentId;

            // Newly assigned faculty should access full student history.
            // If logged-in user is admin, or is the currently assigned faculty:
            // Do not restrict the report search by facultyId (return complete history).
            const isCurrentFaculty = student.facultyId && student.facultyId.toString() === req.user.id;
            const isAdmin = req.user.role === 'admin';

            if (!isCurrentFaculty && !isAdmin) {
                // If not currently assigned, apply existing permission logic:
                // previous faculty can only see their own reports.
                if (facultyId) {
                    query.facultyId = facultyId;
                } else if (req.user.role === 'faculty') {
                    query.facultyId = req.user.id;
                }
            }
        } else {
            // No studentId, normal query (fetch reports for dashboard, daily submission etc.)
            if (facultyId) {
                query.facultyId = facultyId;
            } else if (req.user.role === 'faculty') {
                query.facultyId = req.user.id;
            }
        }

        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            query.date = { $gte: startDate, $lte: endDate };
        }

        // Get submitted reports
        let reports = await Report.find(query)
            .populate('studentId', 'name batchTime')
            .populate('languageId', 'name')
            .populate('languageIds', 'name')
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

            const allStudents = await Student.find({ ...studentQuery, courseCompleted: { $ne: true } }).select('name batchTime');
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

// @desc    Send bulk email reminders for students who did not submit their reports
// @route   POST /api/reports/remind-missing
// @access  Private (Faculty/Admin)
exports.sendMissingReportsReminder = async (req, res) => {
    try {
        const { date, facultyId } = req.body;
        if (!date) {
            return res.status(400).json({ success: false, message: 'Date is required.' });
        }

        // 1. Get submitted reports for this date range
        const query = {};
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        query.date = { $gte: startDate, $lte: endDate };

        let filterFaculty = facultyId;
        if (filterFaculty === 'all') {
            filterFaculty = '';
        } else if (!filterFaculty && req.user.role === 'faculty') {
            filterFaculty = req.user.id;
        }

        if (filterFaculty) {
            query.facultyId = filterFaculty;
        }

        const reports = await Report.find(query).populate('studentId', '_id');
        const submittedStudentIds = reports.map(r => r.studentId ? r.studentId._id.toString() : '');

        // 2. Find all active students for this faculty/all who have not completed their course
        const studentQuery = {
            courseCompleted: { $ne: true }
        };
        if (filterFaculty) {
            studentQuery.facultyId = filterFaculty;
        }

        // Fetch name, email, batchTime, etc.
        const allStudents = await Student.find(studentQuery).select('name email batchTime');
        const missingStudents = allStudents.filter(s => !submittedStudentIds.includes(s._id.toString()));

        if (missingStudents.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No missing reports found for this date. Everyone has submitted!'
            });
        }

        // 3. Initialize nodemailer transport using system credentials
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            return res.status(400).json({
                success: false,
                message: 'System email credentials are not configured in the backend (.env file is missing EMAIL_USER or EMAIL_PASS).'
            });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // 4. Send email to each student
        const sendPromises = missingStudents.map(async (student) => {
            const formattedDate = new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

            const mailOptions = {
                from: `"CDMI Report" <${process.env.EMAIL_USER}>`,
                to: student.email,
                subject: `⚠️ Action Required: Daily Progress Report Missing - ${formattedDate}`,
                html: `
                    <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 20px; border-radius: 20px;">
                        <div style="background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-top: 4px solid #ef4444;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <div style="display: inline-block; background-color: #fef2f2; padding: 12px; border-radius: 50%; margin-bottom: 16px;">
                                    <span style="font-size: 32px; color: #ef4444;">⚠️</span>
                                </div>
                                <h1 style="color: #991b1b; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">Missing Report Notification</h1>
                                <p style="color: #64748b; margin-top: 8px; font-weight: 500; font-size: 14px;">Date: ${formattedDate}</p>
                            </div>
                            
                            <div style="color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
                                <p>Dear <strong>${student.name}</strong>,</p>
                                <p>This is to inform you that we have <strong>not received</strong> your Daily Progress Report for <strong>${formattedDate}</strong>.</p>
                                <p>Submitting daily reports is a mandatory part of your lifecycle at CDMI to track progress and maintain consistency.</p>
                            </div>

                            <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 30px;">
                                <h4 style="margin: 0 0 8px 0; color: #475569; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Student Details</h4>
                                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                                    <tr>
                                        <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Batch Time</td>
                                        <td style="padding: 6px 0; color: #1e293b; font-weight: 700; text-align: right;">${student.batchTime}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Email ID</td>
                                        <td style="padding: 6px 0; color: #1e293b; font-weight: 700; text-align: right;">${student.email}</td>
                                    </tr>
                                </table>
                            </div>

                            <div style="text-align: center;">
                                <p style="color: #475569; font-size: 14px; margin-bottom: 20px;">Please login to your Student Workbook Portal and submit your report immediately.</p>
                                <a href="http://localhost:5173" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 30px; font-weight: 700; font-size: 14px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2); transition: background-color 0.2s;">
                                    Submit Report Now
                                </a>
                            </div>

                            <div style="border-top: 1px solid #f1f5f9; margin-top: 40px; padding-top: 20px; text-align: center; color: #94a3b8; font-size: 11px;">
                                <p>This is an automated system reminder. If you have already submitted your report, please ignore this email or contact your faculty coordinator.</p>
                            </div>
                        </div>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);
        });

        await Promise.all(sendPromises);

        res.status(200).json({
            success: true,
            message: `Successfully sent email reminders to ${missingStudents.length} students.`
        });
    } catch (error) {
        console.error('Error sending bulk report reminders:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
