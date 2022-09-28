# It requires the package JPype1-py3 to be installed (pip install JPype1-py3)
# and the file meico.jar (https://github.com/cemfi/meico/releases/latest)
# to be placed in the same folder as this script.

import os
import sys
from argparse import ArgumentParser
import jpype    # this package (JPype1-py3) enables Java integration in Python

def generate_midi(mei_file, mpm_file):
    # check if meico.jar is present
    if not os.path.isfile(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'meico.jar')):
        print('__file__', __file__)
        print('Cannot find meico.jar. Please place it in the same folder as this Python script.')
        return 69

    # check if MSM file is a valid path to a file
    if (mei_file is None) or (not os.path.isfile(mei_file)) or (mpm_file is None) or (not os.path.isfile(mpm_file)):
        print('Cannot find MEI/MPM input file. Please check that the path and file name are correct.', file=sys.stderr)
        return 66

    # start the JavaVM and set the class path to meico.jar (has to be placed in the same directory as the Python script)
    jpype.startJVM('/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home/lib/server/libjvm.dylib', '-ea', '-Djava.class.path=' + os.path.join(os.path.dirname(os.path.abspath(__file__)), 'meico.jar'))

    # definitions
    File = jpype.java.io.File
    Mei = jpype.JPackage('meico').mei.Mei
    Mpm = jpype.JPackage('meico').mpm.Mpm
    # Msm = jpype.JPackage('meico').msm.Msm
    Performance = jpype.JPackage('meico').mpm.elements.Performance

    meiFile = File(os.path.realpath(mei_file))                  # the MSM file as a Java File object, ensure that the absolute (canonical) path is used (so, when writing the output files to the same path, everything is consistent; alternatively, applications can specify their own output path when calling the write{Mei,Msm,Midi,Audio}() methods)
    mpmFile = File(os.path.realpath(mpm_file))                  # the MPM file as a Java File object, ensure that the absolute (canonical) path is used (so, when writing the output files to the same path, everything is consistent; alternatively, applications can specify their own output path when calling the write{Mei,Msm,Midi,Audio}() methods)

    try:
        mei = Mei(meiFile)
        mpm = Mpm(mpmFile)
    except jpype.JavaException as e:                            # actually an IOException or ParsingException in Java
        print('MEI/MPM file is not valid.', file=sys.stderr)        # error message
        print(e.message(), file=sys.stderr)                     # actual exception message
        jpype.shutdownJVM()                                     # stop the JavaVM
        return 65

    print('MPM includes performances:', mpm.getAllPerformances())

    if mei.isEmpty():                                           # check if MEI is empty
        print('MEI file could not be loaded.', file=sys.stderr) # error message
        jpype.shutdownJVM()                                     # stop the JavaVM
        return 66

    print('Converting MEI to MSM.')
    msms = mei.exportMsm(720, False, False, True)   # usually, the application should use mei.exportMsm(720); the cleanup flag is just for debugging (in debug mode no cleanup is done)
    if msms.isEmpty():                                          # did something come out? if not
        print('No MSM data created.', file=sys.stderr)          # error message
        jpype.shutdownJVM()                                     # stop the JavaVM
        return 1

    for i in range(msms.size()):                                # process all MSM objects just exported from MEI
        print('Processing MSM: movement ' + str(i))
        msm = msms.get(i)                                       # get the MSM instance

    print('Processing MSM: removing rests.')
    msm.removeRests()                                       # purge the data (some applications may keep the rests from the MEI; these should not call this function)

    print('Processing MSM: expanding sequencingMaps.')
    msm.resolveSequencingMaps()                             # instead of using sequencingMaps (which encode repetitions, dacapi etc.) resolve them and, hence, expand all scores and maps according to the sequencing information (be aware: the sequencingMaps are deleted because they no longer apply)

    performance = mpm.getPerformance(0)
    # performedMsm = performance.perform(msm)
    # performedMsm.writeMsm()

    midi = msm.exportExpressiveMidi(mpm.getPerformance(0), True) # do the conversion to MIDI
    midi.setFile('result.mid')

    print('Writing MIDI to file system: ' + midi.getFile().getPath())
    if not midi.writeMidi():                        # write midi file to the file system
        return

    jpype.shutdownJVM()                                         # stop the JavaVM
    return 0



def main(arguments, mei_file):
    """
    Before starting the conversion itself, this function parses the command line arguments. It corresponds with meico's native command line mode.
    :param arguments: holds all command line arguments except the script itself and the final parameter, which is the MEI file reference
    :param mei_file: holds the MEI file reference
    :return:
    """

    parser = ArgumentParser()               # instantiate the command line argument parser

    # set the command line arguments
    parser.add_argument('-m', '--mpm', action='store', default=False, help='defines MPM input file.')

    args = parser.parse_args(arguments)     # parse the command line arguments

    # call the conversion method
    return generate_midi(mpm_file = args.mpm,
                         mei_file = mei_file)


# entry point to this script
if __name__ == "__main__":
    main(sys.argv[1:-1], sys.argv[-1])
