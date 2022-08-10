import { ActionFunction, json } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import {
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/cloudflare";
import { Form, useActionData, useSubmit } from "@remix-run/react";
import { useEffect } from "react";
import opentype, { Font } from "opentype.js";

const getFontMetrics = (font: Font, isWindows: boolean) => {
  const emSize = font.unitsPerEm;
  const typoAscent = font.tables.os2.sTypoAscender;

  const inDesignAscent = typoAscent;
  const browserAscent = isWindows
    ? font.tables.os2.usWinAscent
    : font.tables.hhea.ascender;
  const browserDescent = isWindows
    ? font.tables.os2.usWinDescent
    : -font.tables.hhea.descender;
  const capHeight =
    font.tables.os2.sCapHeight || font.charToGlyph("H").getMetrics().yMax;
  const xHeight =
    font.tables.os2.sxHeight || font.charToGlyph("x").getMetrics().yMax;

  const ascentDelta = browserAscent - inDesignAscent;
  const descentDelta = browserDescent;

  const browserContentArea = browserAscent + browserDescent;

  return {
    contentArea: browserContentArea / emSize,
    ascentDelta: ascentDelta / emSize,
    descentDelta: descentDelta / emSize,
    capHeight: capHeight / emSize,
    xHeight: xHeight / emSize,
  };
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await unstable_parseMultipartFormData(
    request,
    unstable_createMemoryUploadHandler()
  );
  const file = formData.get("font");
  if (!file) {
    throw new Error("No file uploaded");
  }
  
  const fileUploadName = (file as File).name as string;
  const fileUploadNameDot = fileUploadName.lastIndexOf(".");

  const fileName = fileUploadName.substring(0, fileUploadNameDot);
  const fontExt = fileUploadName.substring(fileUploadNameDot + 1);

  const fileArrayBuffer = await (file as File).arrayBuffer();
  const font = opentype.parse(fileArrayBuffer);
  const fontData = {
    fileName: fileName,
    ext: fontExt,
    metadata: {
      windows: getFontMetrics(font, true),
      other: getFontMetrics(font, false),
    },
  };
  return json(fontData);
};

type FontMetrics = {
  contentArea: number;
  ascentDelta: number;
  descentDelta: number;
  capHeight: number;
  xHeight: number;
};

type Metadata = {
  windows: FontMetrics;
  other: FontMetrics;
};

type FontData = {
  fileName: string,
  ext: string,
  metadata:Metadata
}

const bootstrapUI = async (fontData: FontData) => {
  var osName: "other" | "windows" = "other";
  if (navigator.appVersion.indexOf("Win") != -1) {
    osName = "windows";
  }

  const fontSize = 80;
  const lineHeight = 1.2;

  const fontMetadata = fontData.metadata;
  const font = new FontFace(
    fontData.fileName,
    `url(https://fonts.stage.celebrate.company/assets/fonts/${fontData.fileName}.ttf)`
  );
  if (!fontMetadata) {
    throw new Error("no metadata found!");
  }
  // wait for font to be loaded
  await font.load();
  // add font to document
  document.fonts.add(font);
  const lineBoxOverlap = lineHeight - fontMetadata[osName].contentArea;

  document.body.style.setProperty("--fontFamily", fontData.fileName);
  document.body.style.setProperty("--lineHeight", `${lineHeight}`);
  document.body.style.setProperty("--fontSize", `${fontSize}px`);
  document.body.style.setProperty(
    "--fontAscentDelta",
    `${fontMetadata[osName].ascentDelta + lineBoxOverlap / 2}`
  );
  document.body.style.setProperty(
    "--fontCapHeight",
    `${fontMetadata[osName].capHeight}`
  );
  document.body.style.setProperty(
    "--fontXHeight",
    `${fontMetadata[osName].xHeight}`
  );
  document.body.style.setProperty(
    "--fontDescentDelta",
    `${fontMetadata[osName].descentDelta + lineBoxOverlap / 2}`
  );
};

export default function Index() {
  const formData = useActionData();
  console.log(formData);
  useEffect(() => {
    bootstrapUI(formData);
  }, [formData]);
  return (
    <div>
      <Form method="post" encType="multipart/form-data">
        <input type="file" name="font" />
        <button type="submit">Upload</button>
      </Form>
      <div className="container">
        <div className="wrapper">
          <div className="typo"></div>
          <div className="cap-height"></div>
          <div className="x-height"></div>
          <div className="hhead"></div>
          <div className="text-box">
            <div
              className="text with-fix"
              contentEditable
              role="textbox"
              aria-multiline="true"
              spellCheck="false"
            >
              Mein FoToxbuch 2020
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
