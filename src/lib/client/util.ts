export const exportJSON = (data: object, filename = 'data.json') => {
	// 1. Convert JavaScript object/array to JSON string
	const jsonString = JSON.stringify(data, null, 2);

	// 2. Create a Blob with JSON content type
	const blob = new Blob([jsonString], { type: 'application/json' });

	// 3. Create a temporary URL for the blob
	const url = URL.createObjectURL(blob);

	// 4. Create a temporary anchor element
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;

	// 5. Trigger the download
	document.body.appendChild(link);
	link.click();

	// 6. Cleanup
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};
