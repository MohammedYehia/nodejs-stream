import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";
// this remembers partial multibyte sequences between chunks for big files in case of multibyte characters 2-4 bytes
import { StringDecoder } from "string_decoder";

const decoder = new StringDecoder("utf8");

let chunksCount = 0;
const charCodeTransform = new Transform({
	// max chunk size is based on highWaterMark which default to 64 KB
	transform(chunk, encoding, cb) {
		try {
			const text = decoder.write(chunk);
			// const data = text.replace(/(.)/g, (match) => match.charCodeAt() + "|");
			let data = "";
			for (const ch of text) {
				data += ch.charCodeAt() + "|";
			}

			chunksCount++;
			this.push(data);
			cb();
		} catch (error) {
			cb(error);
		}
	},
	flush(cb) {
		// At end of stream, get remaining buffered chars
		try {
			const remaining = decoder.end();
			if (remaining) {
				let data = "";
				for (const ch of remaining) {
					data += ch.charCodeAt() + "|";
				}
				this.push(data);
			}

			console.log("Chunks Count: ", chunksCount);
			cb();
		} catch (error) {
			cb(error);
		}
	},
});

(async () => {
	try {
		await pipeline(
			createReadStream("input.txt", {
				// this will decide how many chunks we can have based on the file size
				// highWaterMark: 85 * 1024,
			}),
			charCodeTransform,
			createWriteStream("output.txt")
		);
		console.log("Transforming Completed");
	} catch (error) {
		console.error("Error ❌:", error);
	}
})();
