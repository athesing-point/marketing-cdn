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

			// Handle Range requests for mp4 files
			if (extension === 'mp4' && request.headers.has('range')) {
				const range = request.headers.get('range');
				const size = object.size;
				const match = /bytes=(\d*)-(\d*)/.exec(range);
				let start = 0;
				let end = size - 1;
				if (match) {
					if (match[1]) start = parseInt(match[1], 10);
					if (match[2]) end = parseInt(match[2], 10);
				}
				if (start > end || start < 0 || end >= size) {
					return new Response('Requested Range Not Satisfiable', {
						status: 416,
						headers: {
							'Content-Range': `bytes */${size}`,
						},
					});
				}
				const partial = await object.body.slice(start, end + 1);
				headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
				headers.set('Accept-Ranges', 'bytes');
				headers.set('Content-Length', (end - start + 1).toString());
				return new Response(partial, {
					status: 206,
					headers,
				});
			}

			return new Response(object.body, {
				headers,
			});
		} catch (error) {
			// Redirect errors to point.com as well
			return Response.redirect('https://point.com', 302);
		}
	},
};
