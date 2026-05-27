import plugin from '@awc/core/plugin'

const config = {
  debug: false,
  purge: true,
  minify: false,
  log: false,
  cache:false,
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  mode: {
    dark: '[data-mode="dark"]',
    // dark: '.dark',
  },
  theme: {
    extend: {
      colors: {
          adafri: {
            theme: {
              light: "rgba(34, 42, 65, 1)",
              dark: "rgba(12, 15, 22, 1)",
            },
          },
          biramsene: "#fefefe",
      },
      fontFamily: {
        adafri:
          'system-ui,-apple-system,system-ui,"NotoSans","Poppins","Roboto","Segoe UI", "Helvetica Neue",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"',
      },
      backgroundImage: {
        app: {
          logo: {
            gif: {
              DEFAULT: "var(--adafri-gif)",
            },
            png: {
              DEFAULT: "var(--adafri-logo)",
            },
          },
        },
        google: {
          logo: {
            svg: {
              DEFAULT: "var(--google-logo)",
            },
          },
        },
      },
    },
    screens: {
      extend: {
        tv: { media: "(min-height: 800px)" },
        xs: { media: "(max-width: 575.98px)" },
        small: { media: "(max-width: 576px) and (max-width: 767.98px)" },
        medium: { media: "(min-width: 768px) and (max-width: 991.98px)" },
        large: { media: "(min-width: 992px) and (max-width: 1199.98px)" },
        extralarge: { media: "(min-width: 1200px) and (max-width: 1399.98px)" },
        xxl: { media: "(min-width: 1400px)" },
      },
    },
    components: true,
  },
    // components: {
    //   extend: {
    //     daterangepicker: {
    //       zindex: "99",
    //       width: "auto",
    //       minWidth: "200px",
    //       minHeight: "200px",
    //       maxHeight: "-webkit-fill-available",
    //       position: "fixed",
    //       presets: {
    //         py: "10px",
    //         px: "10px",
    //       },
    //       toggler: {
    //         py: ".875rem",
    //         px: "1rem",
    //       },
    //     },
    //   },
    // },
  plugins: [
    plugin(({addBase})=>{
      addBase({
        'p:hover, p:focus': {
          color: 'red'
        }
      })
    })
  ]
}
export default config;
