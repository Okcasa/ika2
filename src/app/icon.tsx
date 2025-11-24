import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          fontSize: 24,
          background: 'transparent',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#4f46e5',
        }}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="32" 
          height="32" 
          viewBox="0 0 512 512"
        >
            <path 
                fill="#e0e7ff" 
                stroke="#6366f1" 
                stroke-width="20"
                d="M256 47.5c-115.1,0-208.5,93.4-208.5,208.5S140.9,464.5,256,464.5,464.5,371.1,464.5,256,371.1,47.5,256,47.5Z"
            />
            <ellipse 
                cx="256" 
                cy="256" 
                rx="90" 
                ry="208.5"
                fill="none" 
                stroke="#6366f1" 
                stroke-width="20"
            />
            <ellipse 
                cx="256" 
                cy="256" 
                ry="90" 
                rx="208.5"
                fill="none" 
                stroke="#6366f1" 
                stroke-width="20"
            />
        </svg>
      </div>
    ),
    // ImageResponse options
    {
      // For convenience, we can re-use the exported icons size metadata
      // config to also set the ImageResponse's width and height.
      ...size,
    }
  );
}
