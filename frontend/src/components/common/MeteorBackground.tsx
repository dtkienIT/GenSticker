import type { CSSProperties, FC } from 'react';

type MeteorStyle = CSSProperties & {
  '--meteor-top': string;
  '--meteor-left': string;
  '--meteor-length': string;
  '--meteor-duration': string;
  '--meteor-delay': string;
  '--meteor-travel-x': string;
  '--meteor-travel-y': string;
  '--meteor-angle': string;
};

const METEORS: Array<MeteorStyle> = [
  { '--meteor-top': '7%', '--meteor-left': '88%', '--meteor-length': '132px', '--meteor-duration': '9.5s', '--meteor-delay': '-1.4s', '--meteor-travel-x': '-74vw', '--meteor-travel-y': '42vw', '--meteor-angle': '-29deg' },
  { '--meteor-top': '19%', '--meteor-left': '108%', '--meteor-length': '104px', '--meteor-duration': '12.8s', '--meteor-delay': '-8.2s', '--meteor-travel-x': '-86vw', '--meteor-travel-y': '49vw', '--meteor-angle': '-30deg' },
  { '--meteor-top': '34%', '--meteor-left': '72%', '--meteor-length': '92px', '--meteor-duration': '10.7s', '--meteor-delay': '-5.6s', '--meteor-travel-x': '-66vw', '--meteor-travel-y': '38vw', '--meteor-angle': '-28deg' },
  { '--meteor-top': '-4%', '--meteor-left': '54%', '--meteor-length': '118px', '--meteor-duration': '14.1s', '--meteor-delay': '-10.3s', '--meteor-travel-x': '-70vw', '--meteor-travel-y': '40vw', '--meteor-angle': '-31deg' },
  { '--meteor-top': '48%', '--meteor-left': '116%', '--meteor-length': '148px', '--meteor-duration': '11.9s', '--meteor-delay': '-3.7s', '--meteor-travel-x': '-92vw', '--meteor-travel-y': '52vw', '--meteor-angle': '-29deg' },
  { '--meteor-top': '3%', '--meteor-left': '30%', '--meteor-length': '84px', '--meteor-duration': '13.4s', '--meteor-delay': '-6.9s', '--meteor-travel-x': '-58vw', '--meteor-travel-y': '34vw', '--meteor-angle': '-30deg' },
  { '--meteor-top': '62%', '--meteor-left': '94%', '--meteor-length': '110px', '--meteor-duration': '15.2s', '--meteor-delay': '-12.1s', '--meteor-travel-x': '-78vw', '--meteor-travel-y': '45vw', '--meteor-angle': '-28deg' },
  { '--meteor-top': '24%', '--meteor-left': '48%', '--meteor-length': '126px', '--meteor-duration': '16.3s', '--meteor-delay': '-2.2s', '--meteor-travel-x': '-68vw', '--meteor-travel-y': '39vw', '--meteor-angle': '-31deg' },
  { '--meteor-top': '73%', '--meteor-left': '112%', '--meteor-length': '96px', '--meteor-duration': '13.8s', '--meteor-delay': '-9.6s', '--meteor-travel-x': '-82vw', '--meteor-travel-y': '47vw', '--meteor-angle': '-29deg' },
  { '--meteor-top': '-8%', '--meteor-left': '104%', '--meteor-length': '138px', '--meteor-duration': '17.1s', '--meteor-delay': '-14.7s', '--meteor-travel-x': '-94vw', '--meteor-travel-y': '54vw', '--meteor-angle': '-30deg' },
];

export const MeteorBackground: FC = () => (
  <div className="meteor-background" aria-hidden="true">
    <div className="meteor-background__shooting-stars">
      {METEORS.map((style, index) => (
        <span key={index} className="meteor-background__meteor" style={style} />
      ))}
    </div>
  </div>
);
