/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const CONTENT_TYPES = {
	js: 'application/javascript',
	css: 'text/css',
	html: 'text/html',
	json: 'application/json',
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	svg: 'image/svg+xml',
	webp: 'image/webp',
	woff: 'font/woff',
	woff2: 'font/woff2',
	ttf: 'font/ttf',
	eot: 'application/vnd.ms-fontobject',
	pdf: 'application/pdf',
	zip: 'application/zip',
	mp4: 'video/mp4',
};

// File types that should be previewed in browser
const PREVIEW_TYPES = new Set(['pdf', 'html', 'htm', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'mp4']);

export default {
	async fetch(request, env, ctx) {
		try {
			// Parse the URL and get the pathname
			const url = new URL(request.url);
			const path = url.pathname.slice(1); // Remove leading slash
			const forceDownload = url.searchParams.get('download') === 'true';

			// Redirect root path to point.com
			if (!path) {
				return Response.redirect('https://point.com', 302);
			}

			// Get the file from R2
			const object = await env.CDN_BUCKET.get(path);

			if (!object) {
				// Redirect 404s to point.com
				return Response.redirect('https://point.com', 302);
			}

			// Determine content type based on file extension
			const extension = path.split('.').pop().toLowerCase();
			const contentType = CONTENT_TYPES[extension] || 'application/octet-stream';

			// Prepare headers with caching
			const headers = new Headers({
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000',
				'Access-Control-Allow-Origin': '*',
				ETag: object.httpEtag,
			});

			// Set Content-Disposition based on file type and download parameter
			if (forceDownload) {
				headers.set('Content-Disposition', `attachment; filename="${path.split('/').pop()}"`);
			} else if (PREVIEW_TYPES.has(extension)) {
				headers.set('Content-Disposition', 'inline');
			}

			// Handle MP4 files specially for streaming
			if (extension === 'mp4') {
				headers.set('Accept-Ranges', 'bytes');
				headers.set('Content-Length', object.size.toString());

				// Handle range requests
				if (request.headers.has('range')) {
					try {
						const range = request.headers.get('range');
						const size = object.size;
						const match = /bytes=(\d*)-(\d*)/.exec(range);

						if (!match) {
							return new Response('Invalid Range Header', {
								status: 400,
								headers: {
									'Accept-Ranges': 'bytes',
									'Content-Range': `bytes */${size}`,
								},
							});
						}

						let start = match[1] ? parseInt(match[1], 10) : 0;
						let end = match[2] ? parseInt(match[2], 10) : size - 1;

						// Handle open-ended ranges (e.g., bytes=0-)
						if (match[1] && !match[2]) {
							// For open-ended ranges, limit to 1MB chunks
							end = Math.min(start + 1024 * 1024 - 1, size - 1);
						}

						// Validate ranges
						if (start < 0 || start >= size || end >= size || start > end) {
							return new Response('Requested Range Not Satisfiable', {
								status: 416,
								headers: {
									'Content-Range': `bytes */${size}`,
									'Accept-Ranges': 'bytes',
								},
							});
						}

						const partial = await object.body.slice(start, end + 1);
						headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
						headers.set('Content-Length', (end - start + 1).toString());

						return new Response(partial, {
							status: 206,
							headers,
						});
					} catch (error) {
						console.error('Range request error:', error);
						// Fall back to sending the full file
						headers.set('Content-Range', `bytes */${object.size}`);
						return new Response(object.body, {
							headers,
						});
					}
				}
			}

			return new Response(object.body, {
				headers,
			});
		} catch (error) {
			console.error(error);
			return new Response('Internal Server Error', { status: 500 });
		}
	},
};
