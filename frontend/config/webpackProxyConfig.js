/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
const path = require("path");
const zlib = require("zlib");

// eslint-disable-next-line import/no-extraneous-dependencies
const backend = "http://localhost:5001";

let manifest;
function isHTML(res) {
  const CONTENT_TYPE_HEADER = "content-type";
  const contentType = res.getHeader
    ? res.getHeader(CONTENT_TYPE_HEADER)
    : res.headers[CONTENT_TYPE_HEADER];
  return contentType.includes("text/html");
}

function toDevHTML(originalHtml) {
  let html = originalHtml;
  if (manifest) {
    html = html.replace(
      /<!-- Bundle Import START -->[\s\S]*?<!-- Bundle Import END -->/gi,
      (match) => {
        return manifest.entrypoints
          .map((assetPath) => {
            const ext = path.extname(assetPath).slice(1);

            if (ext === "js") {
              return `<script defer="defer" src="${assetPath}"></script>`;
            } else {
              return `<link rel="stylesheet" type="text/css" href="${assetPath}" />`;
            }
          })
          .join("\n");
      }
    );
  }
  return html;
}

function copyHeaders(originalResponse, response) {
  response.statusCode = originalResponse.statusCode;
  response.statusMessage = originalResponse.statusMessage;
  if (response.setHeader) {
    let keys = Object.keys(originalResponse.headers);
    if (isHTML(originalResponse)) {
      keys = keys.filter(
        (key) => key !== "content-encoding" && key !== "content-length"
      );
    }
    keys.forEach((key) => {
      let value = originalResponse.headers[key];
      if (key === "set-cookie") {
        // remove cookie domain
        value = Array.isArray(value) ? value : [value];
        value = value.map((x) => x.replace(/Domain=[^;]+?/i, ""));
      } else if (key === "location") {
        // set redirects to use local URL
        value = (value || "").replace(backend, "");
      }
      response.setHeader(key, value);
    });
  } else {
    response.headers = originalResponse.headers;
  }
}

/**
 * Manipulate HTML server response to replace asset files with
 * local webpack-dev-server build.
 */
function processHTML(proxyResponse, response) {
  let body = Buffer.from([]);
  let originalResponse = proxyResponse;
  let uncompress;
  const responseEncoding = originalResponse.headers["content-encoding"];

  // decode GZIP response
  if (responseEncoding === "gzip") {
    uncompress = zlib.createGunzip();
  } else if (responseEncoding === "br") {
    uncompress = zlib.createBrotliDecompress();
  } else if (responseEncoding === "deflate") {
    uncompress = zlib.createInflate();
  }
  if (uncompress) {
    originalResponse.pipe(uncompress);
    originalResponse = uncompress;
  }

  originalResponse
    .on("data", (data) => {
      body = Buffer.concat([body, data]);
    })
    .on("error", (error) => {
      // eslint-disable-next-line no-console
      console.error(error);
      response.end(`Error fetching proxied request: ${error.message}`);
    })
    .on("end", () => {
      response.end(toDevHTML(body.toString()));
    });
}

module.exports = (newManifest) => {
  manifest = newManifest;
  return {
    context: "/",
    target: backend,
    hostRewrite: true,
    changeOrigin: true,
    cookieDomainRewrite: "", // remove cookie domain
    selfHandleResponse: true, // so that the onProxyRes takes care of sending the response
    onProxyRes(proxyResponse, request, response) {
      try {
        copyHeaders(proxyResponse, response);
        if (isHTML(response)) {
          processHTML(proxyResponse, response);
        } else {
          proxyResponse.pipe(response);
        }
        response.flushHeaders();
      } catch (e) {
        response.setHeader("content-type", "text/plain");
        response.write(`Error requesting ${request.path} from proxy:\n\n`);
        response.end(e.stack);
      }
    },
  };
};
