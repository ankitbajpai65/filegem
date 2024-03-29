const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
const credentials = require('../credentials.json');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// MULTER

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // cb(null, `${Date.now()}-${file.originalname}`);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const multerUpload = multer({
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024
    }
}).single('file');

// GOOGLE DRIVE

async function authorize() {
    const jwtClient = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        SCOPES
    )
    await jwtClient.authorize();
    return jwtClient;
}

async function googleDriveUpload(authClient, filePath, fileType) {
    try {
        const drive = google.drive({ version: 'v3', auth: authClient });

        const fileStream = fs.createReadStream(filePath);

        const file = await drive.files.create({
            resource: {
                name: path.basename(filePath),
                parents: [credentials.parentFolderId]
            },
            media: {
                body: fileStream,
                mimeType: fileType,
            },
            fields: 'id',
        });
        return file.data.id;
    } catch (error) {
        console.log("Error uploading file to Google Drive:", error);
        throw error;
    }
}

async function upload(req, res, next) {
    try {
        multerUpload(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                console.error("Multer error:", err);
                return res.status(400).json({ error: 'File size limit exceeded (max: 20MB)' });
            } else if (err) {
                console.error("Unknown error:", err);
                return res.status(500).json({ error: "Error uploading file." });
            }

            // console.log(req.file);
            const authClient = await authorize();

            const filePath = req.file.path;
            const fileType = req.file.mimetype;

            const fileId = await googleDriveUpload(authClient, filePath, fileType);

            scheduleFileDeletion(fileId);

            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error("Error deleting file:", err);
                } else {
                    console.log("File deleted from upload folder.");
                }
            });

            req.fileId = fileId;
            next();
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Error uploading file." });
    }
}

async function deleteFileFromDrive(authClient, googleDriveId) {
    try {
        const drive = google.drive({ version: 'v3', auth: authClient });

        await drive.files.delete({ fileId: googleDriveId });
    } catch (error) {
        console.log("Error deleting file from google drive:", error);
    }
}

function scheduleFileDeletion(googleDriveId) {
    setTimeout(async () => {
        try {
            const authClient = await authorize();
            await deleteFileFromDrive(authClient, googleDriveId);
            console.log("File deleted from google drive")
        } catch (error) {
            console.error("Error scheduling file deletion:", error);
        }
    }, 24 * 60 * 60 * 1000);
}

module.exports = { multerUpload, upload };