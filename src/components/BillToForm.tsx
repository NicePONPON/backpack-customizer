"use client";

import CountryCodePicker from "@/components/CountryCodePicker";

export type BillTo = {
  name: string;
  company: string;
  email: string;
  phoneCountry: string;
  phone: string;
  address: string;
  country: string;
};

export const EMPTY_BILL_TO: BillTo = {
  name: "",
  company: "",
  email: "",
  phoneCountry: "SZ",
  phone: "",
  address: "",
  country: "",
};

type Props = {
  value: BillTo;
  onChange: (next: BillTo) => void;
};

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.25)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: 14,
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  color: "#fff",
  fontSize: 12,
  letterSpacing: 0.3,
};

export default function BillToForm({ value, onChange }: Props) {
  const set = (key: keyof BillTo) => (next: string) =>
    onChange({ ...value, [key]: next });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
      }}
    >
      <label style={labelStyle}>
        Name
        <input
          style={inputStyle}
          value={value.name}
          onChange={(e) => set("name")(e.target.value)}
        />
      </label>
      <label style={labelStyle}>
        Company
        <input
          style={inputStyle}
          value={value.company}
          onChange={(e) => set("company")(e.target.value)}
        />
      </label>
      <label style={labelStyle}>
        Email
        <input
          type="email"
          style={inputStyle}
          value={value.email}
          onChange={(e) => set("email")(e.target.value)}
        />
      </label>
      <label style={labelStyle}>
        Mobile phone
        <div style={{ display: "flex", gap: 6 }}>
          <CountryCodePicker
            value={value.phoneCountry}
            onChange={(code) =>
              onChange({ ...value, phoneCountry: code })
            }
          />
          <input
            type="tel"
            style={{ ...inputStyle, flex: 1, minWidth: 0 }}
            value={value.phone}
            onChange={(e) => set("phone")(e.target.value)}
          />
        </div>
      </label>
      <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
        Address
        <input
          style={inputStyle}
          value={value.address}
          onChange={(e) => set("address")(e.target.value)}
        />
      </label>
      <label style={labelStyle}>
        Country
        <input
          style={inputStyle}
          value={value.country}
          onChange={(e) => set("country")(e.target.value)}
        />
      </label>
    </div>
  );
}
