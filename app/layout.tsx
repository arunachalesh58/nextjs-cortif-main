// export default function RootLayout({ children }) {
//   return (
//     <html lang="en">
//       <body style={{ margin: 0, fontFamily: 'sans-serif' }}>
//         {children}
//       </body>
//     </html>
//   );
// }

import React from "react";
import "./globals.css";

export const metadata = { title: "cortif.ai" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="m-0 bg-black text-white antialiased">{children}</body>
    </html>
  );
}
