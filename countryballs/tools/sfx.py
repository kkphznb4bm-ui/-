"""Мини-синтезатор звуков на numpy (общий для роликов)."""
import numpy as np, wave
SR=44100
rng=np.random.default_rng(7)
def T(d): return np.arange(int(SR*d))/SR
class Track:
    def __init__(s,dur): s.out=np.zeros(int(SR*dur))
    def add(s,t0,sig,g=1.0):
        i=int(t0*SR); j=min(len(s.out),i+len(sig))
        if j>i: s.out[i:j]+=sig[:j-i]*g
    def save(s,path,peak=.9,fade=.4):
        o=s.out/np.max(np.abs(s.out))*peak; n=int(fade*SR); o[-n:]*=np.linspace(1,0,n)
        with wave.open(path,'wb') as w:
            w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((o*32767).astype('<i2').tobytes())
def env(n,a=.005,r=.1):
    e=np.ones(n); na=max(1,min(n,int(a*SR))); nr=max(1,min(n,int(r*SR)))
    e[:na]=np.linspace(0,1,na); e[-nr:]*=np.linspace(1,0,nr); return e
def tone(f,d,w='sine',a=.005,r=.1,vib=0):
    t=T(d); ph=2*np.pi*np.cumsum(f*(1+vib*np.sin(2*np.pi*5.5*t))*np.ones_like(t))/SR
    s={'sine':np.sin(ph),'square':np.sign(np.sin(ph)),'saw':2*((ph/(2*np.pi))%1)-1,'tri':2*np.abs(2*((ph/(2*np.pi))%1)-1)-1}[w]
    return s*env(len(t),a,r)
def sweep(f0,f1,d,w='sine'):
    t=T(d); f=f0+(f1-f0)*(t/d); ph=2*np.pi*np.cumsum(f)/SR
    return (np.sin(ph) if w=='sine' else 2*((ph/(2*np.pi))%1)-1)*env(len(t),.01,.05)
def noise(d): return rng.uniform(-1,1,int(SR*d))
def lp(x,a):
    # однополюсный ФНЧ через свёртку с экспоненциальным ядром
    n=int(min(len(x),np.ceil(np.log(1e-4)/np.log(1-a)))) if a<1 else 1
    h=a*(1-a)**np.arange(max(n,1)); return np.convolve(x,h)[:len(x)]
def kick():
    t=T(.3); f=50+120*np.exp(-t*30); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*9)
def hat(): return (noise(.05)-lp(noise(.05),.3))*np.exp(-T(.05)*60)
def clap(): return lp(noise(.15),.5)*np.exp(-T(.15)*25)
def midi(n): return 440*2**((n-69)/12)
