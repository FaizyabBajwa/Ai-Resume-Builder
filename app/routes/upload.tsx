import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import FileUploader from "~/components/FileUploader";
import Navbar from "~/components/Navbar";

import { AIResponseFormat } from "~/constants";
import { convertPdfToImage } from "~/lib/pdf2img";
import { usePuterStore } from "~/lib/puter";
import { generateUUID } from "~/lib/utils";

import type { Route } from "./+types/upload";

export function meta({}: Route.MetaArgs) {
	return [
		{
			title: "Resumind | Upload Resume",
		},
		{
			name: "description",
			content: "Upload your resume to get feedback",
		},
	];
}

const UploadPage = () => {
	const { auth, isLoading, fs, ai, kv } = usePuterStore();

	const navigate = useNavigate();

	const [file, setFile] = useState<File | null>(null);

	const [statusText, setStatusText] = useState<string>("");

	const [isProcessing, setIsProcessing] = useState<boolean>(false);

	useEffect(() => {
		if (!isLoading && !auth.isAuthenticated) {
			navigate("/auth?next=/upload");
		}
	}, [isLoading, auth.isAuthenticated, navigate]);

	const handleFileSelect = (selectedFile: File | null) => {
		setFile(selectedFile);
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (!file) {
			alert("Please upload your resume first.");
			return;
		}

		const formData = new FormData(e.currentTarget);

		const companyName = formData.get("company-name")?.toString().trim() ?? "";

		const jobTitle = formData.get("job-title")?.toString().trim() ?? "";

		const jobDescription = formData.get("job-description")?.toString().trim() ?? "";

		if (!companyName) {
			alert("Please enter the company name.");
			return;
		}

		if (!jobTitle) {
			alert("Please enter the job title.");
			return;
		}

		if (!jobDescription) {
			alert("Please enter the job description.");
			return;
		}

		await handleAnalyze({
			companyName,
			jobTitle,
			jobDescription,
			file,
		});
	};

	const handleAnalyze = async ({
		companyName,
		jobTitle,
		jobDescription,
		file,
	}: {
		companyName: string;
		jobTitle: string;
		jobDescription: string;
		file: File;
	}) => {
		try {
			setIsProcessing(true);

			// -------------------------
			// Upload resume
			// -------------------------

			setStatusText("Uploading your resume...");

			const uploadedFile = await fs.upload([file]);

			console.log("Uploaded resume:", uploadedFile);

			if (!uploadedFile) {
				throw new Error("Failed to upload the resume.");
			}

			// -------------------------
			// Convert PDF to image
			// -------------------------

			setStatusText("Converting your resume to an image...");

			const imageFile = await convertPdfToImage(file);

			console.log("Converted PDF:", imageFile);

			if (!imageFile?.file) {
				throw new Error("Failed to convert the PDF to an image.");
			}

			// -------------------------
			// Upload generated image
			// -------------------------

			setStatusText("Uploading resume preview...");

			const uploadedImage = await fs.upload([imageFile.file]);

			console.log("Uploaded resume image:", uploadedImage);

			if (!uploadedImage) {
				throw new Error("Failed to upload the resume preview.");
			}

			// -------------------------
			// Save initial resume data
			// -------------------------

			setStatusText("Preparing resume data...");

			const uuid = generateUUID();

			const data = {
				id: uuid,

				resumePath: uploadedFile.path,

				imagePath: uploadedImage.path,

				companyName,

				jobTitle,

				jobDescription,

				feedback: "",
			};

			await kv.set(`resume:${uuid}`, JSON.stringify(data));

			// -------------------------
			// AI analysis
			// -------------------------

			setStatusText("Analyzing your resume...");

			const feedback = await ai.feedback(
				uploadedFile.path,
				`
You are an expert in ATS (Applicant Tracking System) and resume analysis.

Analyze the uploaded resume carefully.

Evaluate:
- ATS compatibility
- Resume structure
- Content quality
- Skills
- Experience
- Keywords
- Job relevance
- Areas that need improvement

The company is:
${companyName}

The job title is:
${jobTitle}

The job description is:
${jobDescription}

Use the job description when evaluating how well the resume matches the role.

Provide detailed and useful feedback.

Use exactly the following response format:

${AIResponseFormat}

Return ONLY a valid JSON object.

Do not include markdown.
Do not include backticks.
Do not include additional explanations outside the JSON object.
				`,
			);

			console.log("AI response:", feedback);

			if (!feedback) {
				throw new Error("AI failed to analyze the resume.");
			}

			// -------------------------
			// Extract AI content
			// -------------------------

			const content = feedback.message.content;

			let feedbackText = "";

			if (typeof content === "string") {
				feedbackText = content;
			} else if (Array.isArray(content) && content.length > 0 && "text" in content[0]) {
				feedbackText = content[0].text;
			}

			console.log("AI feedback text:", feedbackText);

			if (!feedbackText) {
				throw new Error("AI returned an empty response.");
			}

			// -------------------------
			// Parse JSON
			// -------------------------

			let parsedFeedback;

			try {
				parsedFeedback = JSON.parse(feedbackText);
			} catch (parseError) {
				console.error("Invalid AI JSON:", feedbackText);

				throw new Error("AI returned invalid JSON.");
			}

			data.feedback = parsedFeedback;

			// -------------------------
			// Save final data
			// -------------------------

			setStatusText("Saving analysis...");

			await kv.set(`resume:${uuid}`, JSON.stringify(data));

			// -------------------------
			// Redirect
			// -------------------------

			setStatusText("Analysis complete. Redirecting...");

			navigate(`/resume/${uuid}`);
		} catch (error) {
			console.error("Resume analysis failed:", error);

			if (error instanceof Error) {
				setStatusText(`Error: ${error.message}`);
			} else {
				setStatusText("Something went wrong while analyzing your resume.");
			}

			setIsProcessing(false);
		}
	};

	return (
		<main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
			<Navbar />

			<section className="main-section">
				<div className="page-heading">
					<h1>Smart feedback for your dream job</h1>

					{isProcessing ? (
						<>
							<h2>{statusText}</h2>

							<img src="/images/resume-scan.gif" className="w-full" alt="Analyzing resume" />
						</>
					) : (
						<h2>Drop your resume for an ATS score and improvement tips.</h2>
					)}

					{!isProcessing && (
						<form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
							<div className="form-div">
								<label htmlFor="company-name">Company Name</label>

								<input type="text" name="company-name" placeholder="Company Name" id="company-name" required />
							</div>

							<div className="form-div">
								<label htmlFor="job-title">Job Title</label>

								<input type="text" name="job-title" placeholder="Job Title" id="job-title" required />
							</div>

							<div className="form-div">
								<label htmlFor="job-description">Job Description</label>

								<textarea name="job-description" id="job-description" placeholder="Job Description" rows={5} required />
							</div>

							<div className="form-div">
								<label>Upload Resume</label>

								<FileUploader onFileSelect={handleFileSelect} />
							</div>

							{file && (
								<button className="primary-button" type="submit">
									Save & Analyze Resume
								</button>
							)}
						</form>
					)}
				</div>
			</section>
		</main>
	);
};

export default UploadPage;
