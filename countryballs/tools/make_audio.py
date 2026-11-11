"""Генерирует звуковую дорожку для skit.html (20 с, 44.1 кГц) -> skit-audio.wav"""
import numpy as np, wave, sys
SR=44100; DUR=20.0
out=np.zeros(int(SR*DUR))
rng=np.random.default_rng(7)
def T(d): return np.arange(int(SR*d))/SR
def add(t0,sig,g=1.0):
    i=int(t0*SR); j=min(len(out),i+len(sig)); out[i:j]+=sig[:j-i]*g
def env(n,a=.005,r=.1):
    e=np.ones(n); na=max(1,int(a*SR)); nr=max(1,min(n,int(r*SR)))
    e[:na]=np.linspace(0,1,na); e[-nr:]*=np.linspace(1,0,nr); return e
def tone(f,d,wave_='sine',a=.005,r=.1,vib=0):
    t=T(d); ph=2*np.pi*np.cumsum(f*(1+vib*np.sin(2*np.pi*5.5*t))*np.ones_like(t))/SR
    s={'sine':np.sin(ph),'square':np.sign(np.sin(ph)),'saw':2*((ph/(2*np.pi))%1)-1,
       'tri':2*np.abs(2*((ph/(2*np.pi))%1)-1)-1}[wave_]
    return s*env(len(t),a,r)
def noise(d): return rng.uniform(-1,1,int(SR*d))
def lp(x,a): # простой однополюсный ФНЧ
    y=np.zeros_like(x); acc=0.
    for i,v in enumerate(x): acc+=a*(v-acc); y[i]=acc
    return y
def kick():
    t=T(.3); f=50+120*np.exp(-t*30); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*9)
def midi(n): return 440*2**((n-69)/12)

# --- часы тикают в классе
for k in np.arange(0,4.2,.5): add(k,tone(2000 if int(k*2)%2 else 1500,.03,'sine',.001,.02),.15)
# --- учитель «бла-бла» (как в мультиках)
t=.3
while t<2.75:
    d=rng.uniform(.07,.13); add(t,tone(rng.uniform(220,330),d,'square',.005,.03),.12); t+=d+.02
# --- дверь хлопнула
add(3.0,lp(noise(.25),.15)*np.exp(-T(.25)*18),1.0); add(3.0,kick(),.8)
# --- «глоть» в тишине
add(3.6,tone(300,.12,'sine',.002,.05,0)*np.linspace(1,.3,int(.12*SR)),.4)
# --- райзер перед дропом
r=T(.5); add(3.7,np.sin(2*np.pi*np.cumsum(200+1800*(r/.5)**2)/SR)*np.linspace(0,1,len(r))*.15)
add(3.7,noise(.5)*np.linspace(0,1,int(.5*SR))*.12)
# --- ВЕЧЕРИНКА 128 BPM
bpm=128; b=60/bpm; t0=4.2; nb=int((11.0-t0)/b)
bassline=[36,36,43,41, 36,36,46,43]
arp=[60,63,67,72,70,67,63,67]
for i in range(nb):
    tt=t0+i*b
    add(tt,kick(),.9)
    add(tt+b/2,lp(noise(.05),.9)-lp(noise(.05),.3),.25)
    if i%2==1: add(tt,lp(noise(.15),.5)*np.exp(-T(.15)*25),.5)
    add(tt+b/2,lp(tone(midi(bassline[i%8]),b*.45,'saw',.005,.05),.08),.55)
    for k in range(2):
        n=arp[(i*2+k)%8]+(12 if (i//8)%2 else 0)
        add(tt+k*b/2,tone(midi(n),b*.4,'square',.003,.06),.07)
# --- скрэтч пластинки
s=T(.45); f=900*np.exp(-s*6)+80
add(11.0,(np.sin(2*np.pi*np.cumsum(f)/SR)*.5+noise(.45)*.3)*env(len(s),.005,.1),.6)
# --- шаги
for k in [11.35,11.7,12.05]: add(k,lp(noise(.08),.05)*np.exp(-T(.08)*40)*3+kick()[:3528]*.5,.5)
# --- скрип двери
c=T(.35); add(12.1,np.sign(np.sin(2*np.pi*np.cumsum(300+150*np.sin(c*20))/SR))*env(len(c),.02,.1),.05)
# --- караоке Филиппин (оригинальная мелодия)
mel=[(67,.4),(69,.2),(71,.6),(74,.3),(72,.3),(71,.5),(69,.7)]
t=12.45
for n,d in mel:
    if t>15.3: break
    d2=min(d,15.38-t); add(t,tone(midi(n),d2,'tri',.03,.05,vib=.012),.22); add(t,tone(midi(n)*2,d2,'sine',.03,.05,vib=.012),.05); t+=d
# --- неловкая тишина: сверчки
for k in np.arange(15.5,16.0,.25):
    for j in range(3): add(k+j*.04,tone(4500,.025,'sine',.002,.01),.08)
# --- падающая шапка: свист вниз + БОНК
w=T(.45); add(15.9,np.sin(2*np.pi*np.cumsum(1800-1300*(w/.45))/SR)*env(len(w),.02,.05),.12)
add(16.35,tone(1100,.12,'sine',.001,.1)*np.exp(-T(.12)*20),.6); add(16.35,tone(180,.3,'sine',.001,.25)*np.exp(-T(.3)*10),.6)
# --- грустный тромбон «ва-ва-ва-ваааа»
tb=[(58,.32),(57,.32),(56,.32),(55,1.1)]; t=17.65
for i,(n,d) in enumerate(tb):
    add(t,lp(tone(midi(n),d,'saw',.03,.08,vib=.03 if i==3 else .004),.12),.35); t+=d+.03
# --- смешки класса в конце
for k in np.arange(18.0,19.6,.16): add(k+rng.uniform(0,.05),tone(rng.uniform(330,520),.08,'square',.005,.04),.06)

out=out/np.max(np.abs(out))*.9
fade=int(.4*SR); out[-fade:]*=np.linspace(1,0,fade)
pcm=(out*32767).astype('<i2')
with wave.open(sys.argv[1] if len(sys.argv)>1 else 'skit-audio.wav','wb') as wv:
    wv.setnchannels(1); wv.setsampwidth(2); wv.setframerate(SR); wv.writeframes(pcm.tobytes())
print('ok')
