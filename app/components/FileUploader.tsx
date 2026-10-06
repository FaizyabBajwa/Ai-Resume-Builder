import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface FileUploaderProps {
	onFileSelect: (file: File | null) => void;
}

const FileUploader = ({ onFileSelect }: FileUploaderProps) => {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [errorMessage, setErrorMessage] = useState("");

	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			const file = acceptedFiles[0] ?? null;

			if (!file) {
				return;
			}

			setSelectedFile(file);
			setErrorMessage("");
			onFileSelect(file);
		},
		[onFileSelect],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		multiple: false,

		accept: {
			"application/pdf": [".pdf"],
		},

		maxSize: 20 * 1024 * 1024,

		onDropRejected: (rejections) => {
			const rejection = rejections[0];

			if (!rejection) return;

			const error = rejection.errors[0];

			if (error?.code === "file-too-large") {
				setErrorMessage("PDF must be smaller than 20 MB.");
			} else if (error?.code === "file-invalid-type") {
				setErrorMessage("Only PDF files are allowed.");
			} else {
				setErrorMessage("Unable to upload this file.");
			}

			setSelectedFile(null);
			onFileSelect(null);
		},
	});

	const handleRemoveFile = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		e.stopPropagation();

		setSelectedFile(null);
		setErrorMessage("");
		onFileSelect(null);
	};

	const formatSize = (bytes: number) => {
		if (!bytes) return "0 Bytes";

		const units = ["Bytes", "KB", "MB", "GB"];
		const index = Math.floor(Math.log(bytes) / Math.log(1024));

		return `${(bytes / 1024 ** index).toFixed(2)} ${units[index]}`;
	};

	return (
		<div className="w-full gradient-border">
			<div
				{...getRootProps({
					className: `uploader-drag-area ${isDragActive ? "gradient-hover" : "hover:gradient-hover"}`,
				})}>
				<input {...getInputProps()} />

				<div className="space-y-4 cursor-pointer">
					<div className="mx-auto w-16 h-16 flex items-center justify-center">
						<img src="/icons/info.svg" alt="Upload" className="size-20" />
					</div>

					{selectedFile ? (
						<div className="uploader-selected-file" onClick={(e) => e.stopPropagation()}>
							<div className="flex items-center space-x-3">
								<img src="/images/pdf.png" alt="PDF" className="size-10" />

								<div>
									<p className="text-sm font-medium text-gray-700 truncate max-w-xs">{selectedFile.name}</p>

									<p className="text-xs text-gray-500">{formatSize(selectedFile.size)}</p>
								</div>
							</div>

							<button type="button" onClick={handleRemoveFile} className="p-2 cursor-pointer">
								<img src="/icons/cross.svg" alt="Remove" className="w-4 h-4" />
							</button>
						</div>
					) : (
						<div>
							{isDragActive ? (
								<p className="text-lg text-gray-500">Drop your PDF here</p>
							) : (
								<>
									<p className="text-lg text-gray-500">
										<span className="font-semibold">Click to upload</span> or drag and drop
									</p>

									<p className="text-lg text-gray-500">PDF (max. 20 MB)</p>
								</>
							)}
						</div>
					)}

					{errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
				</div>
			</div>
		</div>
	);
};

export default FileUploader;
