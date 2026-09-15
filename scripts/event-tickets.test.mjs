import assert from "node:assert/strict";
import test from "node:test";
import {
  formatTicketPhoneLine,
  formatUsPhone,
  publicTicketCtas,
  telHref,
  ticketVendorLabel,
  usPhoneDigits,
} from "./entertainment-pages.mjs";

test("Ticketmaster host becomes the button label", () => {
  assert.equal(
    ticketVendorLabel(
      "https://www.ticketmaster.com/whisper-of-autumn-lincoln-california-11-14-2026/event/1C00651F9B69BA0A",
    ),
    "Ticketmaster",
  );
  assert.equal(ticketVendorLabel("https://www.redhawkcasino.com/autumnharmony/"), "Red Hawk");
});

test("US phone formats for tel links", () => {
  assert.equal(usPhoneDigits("(916) 804-5485"), "9168045485");
  assert.equal(formatUsPhone("9168045485"), "(916) 804-5485");
  assert.equal(telHref("916-804-5485"), "tel:+19168045485");
});

test("flyer phone lines are number then name", () => {
  assert.equal(
    formatTicketPhoneLine({ phone: "9163902124", label: "Diệu Nguyện" }),
    "(916) 390-2124 Diệu Nguyện",
  );
  assert.equal(formatTicketPhoneLine({ phone: "9164303498", label: "" }), "(916) 430-3498");
});

test("online URLs win over flyer phones", () => {
  const ctas = publicTicketCtas([
    { kind: "phone", label: "Trina", phone: "9168045485" },
    {
      kind: "url",
      label: "Ticketmaster",
      url: "https://www.ticketmaster.com/event/1",
    },
  ]);
  assert.equal(ctas.length, 1);
  assert.equal(ctas[0].kind, "url");
});
