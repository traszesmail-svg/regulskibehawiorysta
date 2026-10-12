package pl.regulski.phoneagent;

/** Clock abstraction for deterministic time testing. */
public interface Clock {
    long currentTimeMillis();
    Clock SYSTEM = System::currentTimeMillis;
}
